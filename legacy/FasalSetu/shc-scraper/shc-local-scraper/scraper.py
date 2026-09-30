# Copyright 2022 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Download soil health cards for the given state.

Portal migration note (August 2026):
  soilhealth.dac.gov.in was rebuilt as a React SPA.  The old ASP.NET
  endpoints (/CommonFunction/GetDistrict, GetSubdis, GetVillage) and the
  #forgeryToken CSRF element no longer exist.  The new portal uses a
  GraphQL API at https://soilhealth4.dac.gov.in/graphql.

  INGEST (state/district/block/village enumeration) now calls that GraphQL
  API directly via plain HTTP — no headless browser needed.

  CARDS / SCRAPE (retrieving the actual per-village card lists and HTML
  reports) still use the headless browser against the old-style numbered
  subdomains (soilhealth.dac.gov.in, soilhealth3.dac.gov.in, …) which
  remain reachable for the card-download portion of the site.
"""
from bs4 import BeautifulSoup

import logging
import storage
import utils

import requests
from requests import Request as _Req          # plain alias to avoid shadowing
from requests.adapters import HTTPAdapter, Retry
import time
import os
import urllib.parse
import json

import geo_cache

# pyppeteer Request is only needed for the (commented-out) request-intercept
# helper; importing it unconditionally crashes if pyppeteer isn't installed
# yet, so guard it.
try:
    from pyppeteer.network_manager import Request as PyppeteerRequest
except ImportError:
    PyppeteerRequest = None

import nest_asyncio
nest_asyncio.apply()

import asyncio
import pyppeteer

requests.adapters.DEFAULT_RETRIES = 5

# ---------------------------------------------------------------------------
# GraphQL API (new portal, August 2026)
# ---------------------------------------------------------------------------
_GQL_ENDPOINT = 'https://soilhealth4.dac.gov.in/graphql'
_GQL_MAIN_URL  = 'https://soilhealth.dac.gov.in/'

# Mimic a real browser.  The WAF on soilhealth4 throttles bare requests/curl
# UAs much faster than browser-sourced traffic.
_GQL_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, */*',
    'Origin': 'https://soilhealth.dac.gov.in',
    'Referer': 'https://soilhealth.dac.gov.in/',
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
}

_GQL_TIMEOUT = 20   # seconds per request
_GQL_RETRIES = 5    # max attempts before giving up

# Back-off schedule for throttle responses (seconds).
# The government WAF window appears to be ~60 s for burst blocks and
# up to several minutes for sustained-burst IP blocks, so we use a
# much gentler schedule than classic 2^n exponential.
_GQL_BACKOFF = [5, 15, 45, 90, 180]   # indexed by (attempt - 1), capped at last value

# Module-level requests.Session, created lazily.  Using a persistent session
# ensures cookies set by the SPA's main page are forwarded to the GraphQL
# backend — some WAFs use the absence of a session cookie as a throttle signal.
_gql_session: requests.Session = None


def _get_gql_session() -> requests.Session:
    """Return (and lazily create + warm) the shared requests.Session.

    On first call we hit the main SPA page so the server sets any session
    cookie it expects before we start firing GraphQL queries.
    """
    global _gql_session
    if _gql_session is not None:
        return _gql_session

    s = requests.Session()
    s.headers.update(_GQL_HEADERS)

    # Warm the session: fetch the SPA shell so the server sets cookies.
    try:
        resp = s.get(_GQL_MAIN_URL, timeout=10)
        logging.info(f'GQL session warmed: GET {_GQL_MAIN_URL} -> {resp.status_code}')
    except Exception as exc:
        # Non-fatal — we can still try GraphQL without cookies.
        logging.warning(f'GQL session warm-up failed ({exc}), continuing anyway')

    _gql_session = s
    return s


def _gql_backoff_wait(attempt: int, msg: str = '') -> None:
    """Sleep for the appropriate back-off duration and log it."""
    wait = _GQL_BACKOFF[min(attempt - 1, len(_GQL_BACKOFF) - 1)]
    logging.warning(
        f'GQL throttled/busy (attempt {attempt}{": " + msg if msg else ""}), '
        f'backing off {wait}s'
    )
    time.sleep(wait)


def _is_throttle_response(body: dict) -> bool:
    """Return True if the GraphQL response body looks like a throttle/busy error.

    The soilhealth4 WAF returns HTTP 200 or 400 with a sanitised JSON errors
    array rather than a proper 429, so we detect it by message content.
    """
    if 'errors' not in body:
        return False
    msg = (body['errors'][0].get('message') or '').lower()
    return any(phrase in msg for phrase in (
        'unable to connect',
        'try again later',
        'server is being updated',
        'too many requests',
        'service unavailable',
    ))


def _ist_now() -> str:
    """Return current time as a human-readable IST string (UTC+5:30)."""
    from datetime import datetime, timezone, timedelta
    ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    return ist.strftime('%Y-%m-%d %H:%M IST')


def _gql_backend_is_up() -> bool:
    """Quick probe: returns True if the GraphQL *gateway* is reachable.

    Uses the cheapest possible query (__typename) which the gateway answers
    itself without touching any upstream microservice.  If this returns False
    the whole server is unreachable.  If this returns True but data queries
    fail, the gateway is up but the MongoDB-backed microservice is down
    (maintenance window).
    """
    try:
        session = _get_gql_session()
        r = session.post(
            _GQL_ENDPOINT,
            data=json.dumps({'query': '{ __typename }', 'variables': {}}),
            timeout=10,
        )
        body = r.json()
        return 'data' in body and not _is_throttle_response(body)
    except Exception:
        return False


def _gql(query: str, variables: dict = None, retries: int = _GQL_RETRIES) -> dict:
    """Execute a GraphQL query against the new SHC portal API.

    Features
    --------
    * Uses a persistent, warmed requests.Session (cookies forwarded).
    * Browser-like User-Agent + Accept headers to avoid WAF fingerprinting.
    * Content-based throttle detection (server returns 200/400 with an
      errors array, not a proper 429).
    * Maintenance-window detection: if the gateway responds to __typename
      but the data resolver keeps failing, we fail fast with an actionable
      message instead of burning all retries on a condition that won't
      recover in minutes.
    * Gentle back-off schedule tuned to the government server's window
      (5 → 15 → 45 → 90 → 180 s) rather than aggressive 2^n exponential.
    * Raises RuntimeError only after all retries are exhausted.

    Returns the parsed ``data`` dict on success.
    """
    session = _get_gql_session()
    payload = json.dumps({'query': query, 'variables': variables or {}})

    for attempt in range(1, retries + 1):
        try:
            r = session.post(
                _GQL_ENDPOINT,
                data=payload,
                timeout=_GQL_TIMEOUT,
            )
            # Treat 4xx/5xx as transient unless it's the last attempt
            if r.status_code in (429, 503, 502, 504):
                raise requests.HTTPError(f'HTTP {r.status_code}', response=r)
            # 400 from this server usually means throttle, not bad query —
            # parse body to confirm before giving up.
            if r.status_code == 400:
                try:
                    body = r.json()
                    if _is_throttle_response(body):
                        raise requests.HTTPError('HTTP 400 throttle', response=r)
                except ValueError:
                    pass  # non-JSON 400 — fall through to raise_for_status
                r.raise_for_status()

            body = r.json()

        except requests.HTTPError as exc:
            if attempt == retries:
                raise RuntimeError(
                    f'GraphQL HTTP error after {retries} attempts: {exc}'
                )
            # Before backing off, check whether the gateway itself is up.
            # If __typename works but our query doesn't, this is a backend
            # maintenance window — fail fast rather than waiting minutes.
            if _gql_backend_is_up():
                logging.warning(
                    'GraphQL gateway is up but data resolver is failing. '
                    'The backend microservice appears to be in a maintenance '
                    'window (common on government servers overnight / IST). '
                    'Try again in 30–60 minutes.'
                )
                raise RuntimeError(
                    'GraphQL backend microservice is down (maintenance window). '
                    'The gateway responds to __typename but all data resolvers '
                    'return "Unable to connect". '
                    'This is a server-side issue — try again in 30–60 minutes.\n'
                    f'IST time now: {_ist_now()}'
                )
            _gql_backoff_wait(attempt, str(exc))
            continue
        except Exception as exc:
            if attempt == retries:
                raise RuntimeError(
                    f'GraphQL request failed after {retries} attempts: {exc}'
                )
            _gql_backoff_wait(attempt, str(exc))
            continue

        # ── Successful HTTP response ──────────────────────────────────────
        if _is_throttle_response(body):
            if attempt == retries:
                raise RuntimeError(
                    f'GraphQL server still throttling after {retries} attempts. '
                    'Wait a few minutes before re-running.'
                )
            # Same maintenance-window fast-fail check on throttle responses.
            if _gql_backend_is_up():
                logging.warning(
                    'Gateway up (__typename OK) but data resolver returning '
                    '"Unable to connect" — treating as maintenance window.'
                )
                raise RuntimeError(
                    'GraphQL backend microservice is down (maintenance window). '
                    'Try again in 30–60 minutes.\n'
                    f'IST time now: {_ist_now()}'
                )
            _gql_backoff_wait(attempt, body['errors'][0].get('message', ''))
            continue

        if 'errors' in body:
            # Non-throttle GraphQL error — don't retry, it won't help.
            raise RuntimeError(
                f'GraphQL error: {body["errors"][0].get("message", str(body["errors"]))}'
            )

        return body.get('data', {})

    raise RuntimeError(f'GraphQL request failed after {retries} attempts')


class ReportServerUpdating(Exception):
     pass

class UnableToDownloadCard(Exception):
     pass

async def req_intercept(req):
    req.headers.update({'X-Requested-With': 'XMLHttpRequest'})
    await req.continue_(overrides={'headers': req.headers})

def offlineStates():
  """State metadata map keyed by numeric state code (string).

  'gql_id' is the MongoDB ObjectId used by the new GraphQL API
  (soilhealth4.dac.gov.in).  Populated for states confirmed against the
  live API; None means the ID will be looked up lazily on first use and
  cached into this dict.  'endpoint' is kept for the CARDS/SCRAPE steps
  which still hit the old card-download subdomains.
  """
  return {
    # ── States served by soilhealth.dac.gov.in ───────────────────────────
    '1':  {'name': 'Jammu And Kashmir',        'id': '1',  'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '2':  {'name': 'Himachal Pradesh',         'id': '2',  'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '3':  {'name': 'Punjab',                   'id': '3',  'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '4':  {'name': 'Chandigarh',               'id': '4',  'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '5':  {'name': 'Uttarakhand',              'id': '5',  'gql_id': None, 'endpoint': 'http://soilhealth8.dac.gov.in'},
    '6':  {'name': 'Haryana',                  'id': '6',  'gql_id': '63f5c2cf98d5e0c03dba5507', 'endpoint': 'http://soilhealth.dac.gov.in'},
    '7':  {'name': 'Delhi',                    'id': '7',  'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '8':  {'name': 'Rajasthan',                'id': '8',  'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '9':  {'name': 'Uttar Pradesh',            'id': '9',  'gql_id': None, 'endpoint': 'http://soilhealth4.dac.gov.in'},
    '10': {'name': 'Bihar',                    'id': '10', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '11': {'name': 'Sikkim',                   'id': '11', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '12': {'name': 'Arunachal Pradesh',        'id': '12', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '13': {'name': 'Nagaland',                 'id': '13', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '14': {'name': 'Manipur',                  'id': '14', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '15': {'name': 'Mizoram',                  'id': '15', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '16': {'name': 'Tripura',                  'id': '16', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '17': {'name': 'Meghalaya',                'id': '17', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '18': {'name': 'Assam',                    'id': '18', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '19': {'name': 'West Bengal',              'id': '19', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '20': {'name': 'Jharkhand',                'id': '20', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '21': {'name': 'Odisha',                   'id': '21', 'gql_id': None, 'endpoint': 'http://soilhealth8.dac.gov.in'},
    '22': {'name': 'Chhattisgarh',             'id': '22', 'gql_id': None, 'endpoint': 'http://soilhealth3.dac.gov.in'},
    '23': {'name': 'Madhya Pradesh',           'id': '23', 'gql_id': None, 'endpoint': 'http://soilhealth5.gov.in'},
    '24': {'name': 'Gujarat',                  'id': '24', 'gql_id': None, 'endpoint': 'http://soilhealth9.dac.gov.in'},
    '27': {'name': 'Maharashtra',              'id': '27', 'gql_id': None, 'endpoint': 'http://soilhealth8.dac.gov.in'},
    '28': {'name': 'Andhra Pradesh',           'id': '28', 'gql_id': None, 'endpoint': 'http://soilhealth6.dac.gov.in'},
    '29': {'name': 'Karnataka',                'id': '29', 'gql_id': None, 'endpoint': 'http://soilhealth2.dac.gov.in'},
    '30': {'name': 'Goa',                      'id': '30', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '31': {'name': 'Lakshadweep',              'id': '31', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '32': {'name': 'Kerala',                   'id': '32', 'gql_id': None, 'endpoint': 'http://soilhealth9.dac.gov.in'},
    '33': {'name': 'Tamil Nadu',               'id': '33', 'gql_id': None, 'endpoint': 'http://soilhealth9.dac.gov.in'},
    '34': {'name': 'Puducherry',               'id': '34', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '35': {'name': 'Andaman And Nicobar Islands', 'id': '35', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
    '36': {'name': 'Telangana',                'id': '36', 'gql_id': None, 'endpoint': 'http://soilhealth3.dac.gov.in'},
    '37': {'name': 'Ladakh',                   'id': '37', 'gql_id': None, 'endpoint': 'http://soilhealth.dac.gov.in'},
  }


def _resolve_gql_id(state_code: str, states_map: dict) -> str:
  """Return the GraphQL MongoDB _id for a state, fetching it if not cached.

  The result is written back into states_map so subsequent calls are free.
  Raises RuntimeError if the state cannot be found via the API.
  """
  entry = states_map[state_code]
  if entry.get('gql_id'):
    return entry['gql_id']

  data = _gql(
      'query GetState($code: String) { getState(code: $code) { _id code name } }',
      {'code': state_code},
  )
  records = data.get('getState') or []
  if not records:
    raise RuntimeError(
        f'GraphQL getState returned no results for code={state_code}. '
        'Check that the state code is correct (run LIST-STATES).'
    )
  gql_id = records[0]['_id']
  entry['gql_id'] = gql_id
  logging.info(f'Resolved gql_id for state {state_code} ({entry["name"]}): {gql_id}')
  return gql_id

class ShcDL:
  base_url = 'https://soilhealth.dac.gov.in/HealthCard/HealthCard/state'

  async def setup(self):
    # Resolve executable path: prefer RUN_LOCALLY env var (explicit path or
    # "1" to auto-detect), then fall back to the Linux path for containers.
    _run_locally = os.environ.get('RUN_LOCALLY', '')
    _mac_chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    if _run_locally:
      # Use explicit path if provided, otherwise auto-detect macOS Chrome.
      _exec = _run_locally if os.path.isfile(_run_locally) else (
          _mac_chrome if os.path.isfile(_mac_chrome) else None
      )
      _launch_opts = {
          'headless': True,
          'devTools': False,
          'autoClose': False,
          'args': ['--no-sandbox', '--disable-dev-shm-usage'],
      }
      if _exec:
        _launch_opts['executablePath'] = _exec
      self.browser = await pyppeteer.launch(_launch_opts,
          handleSIGINT=False,
          handleSIGTERM=False,
          handleSIGHUP=False)
    else:
      # Container / Linux path
      self.browser = await pyppeteer.launch({
          'headless': True,
          'executablePath': '/usr/bin/chromium',
          'autoClose': False,
          'args': ['--no-sandbox', '--disable-dev-shm-usage'],
      },
          handleSIGINT=False,
          handleSIGTERM=False,
          handleSIGHUP=False)
    self.page = await self.browser.newPage()
    #self.page.on('console', lambda msg: utils.logText(f'console message {msg.type} {msg.text} {msg.args}'))
    self.states = offlineStates() #{ state['id'] : state for state in await self.getStates() }
    await self.page.setViewport({'width': 0, 'height': 0})

  async def newPage(self):
    self.page = await self.browser.newPage()

  async def close(self):
    await self.page.close()
    await self.browser.close()

  async def getToken(self):
    # getToken used to navigate to the ASP.NET portal and scrape a hidden
    # #forgeryToken input.  That page no longer exists (the portal is now a
    # React SPA).  getDistricts/getSubDistricts/getVillages now call the
    # GraphQL API directly and don't need a CSRF token, so this method is a
    # no-op kept only for backwards-compatibility with any call sites that
    # haven't been updated yet.
    return None

  async def getStates(self):
    await self.page.goto(self.base_url)
    endpoints = await self.page.evaluate('Array.prototype.slice.call(document.getElementById("StateUrl").children).map(ele => { return { state: ele.textContent, endpoint: ele.value}}).filter(ele => ele.state != "--SELECT--")', force_expr=True)
    ids={}
    for endpoint in endpoints:
      
      print(f"Goto {endpoint['endpoint']}\n")
      await self.page.goto(endpoint['endpoint']) 
      
      await self.page.waitForFunction("document.getElementById('State_cd2') != null")
      await self.page.waitForFunction("document.getElementById('State_cd2').length > 1")
      results = await self.page.evaluate('Array.prototype.slice.call(document.getElementById("State_cd2").children).map(ele => { return { state: ele.textContent, id: ele.value}}).filter(ele => ele.state != "--SELECT--")', force_expr=True)
      for ele in results:
        ids[ele['id']] = ele['state']

    result = []
    for state in ids:
        res = {}        
        res['name'] = ids[state]
        res['id'] = state
        for endpoint in endpoints:
            if ids[state] == endpoint['state']:
                endpoint = endpoint['endpoint']
                res['endpoint'] = endpoint[:endpoint.index("/", 8)]
        result.append(res)
    return result

  async def getDistricts(self, state_code):
    """Return districts for a state using the GraphQL API, with local cache.

    Cache key  : state_code (numeric string, e.g. '6')
    Cache file : data/geo_cache/districts/<state_code>.json
    TTL        : 30 days (geography changes rarely)

    The new portal (August 2026) uses getdistrictAndSubdistrictBystate
    keyed by MongoDB ObjectId, not the old numeric statecode.
    Each returned dict has 'id' (MongoDB _id) and 'name'.
    The 'id' is what subsequent getBlock / getVillages calls expect.
    """
    cached = geo_cache.get_districts(state_code)
    if cached is not None:
        logging.info(f'geo_cache HIT: districts for state {state_code} ({len(cached)} records)')
        return cached

    gql_id = _resolve_gql_id(state_code, self.states)
    data = _gql(
        'query GetDistricts($state: ID) {'
        '  getdistrictAndSubdistrictBystate(state: $state) { _id name code }'
        '}',
        {'state': gql_id},
    )
    records = data.get('getdistrictAndSubdistrictBystate') or []
    result = [
        {'name': r['name'], 'id': r['_id'], 'code': r.get('code', '')}
        for r in records
    ]
    geo_cache.set_districts(state_code, result)
    logging.info(f'geo_cache SET: districts for state {state_code} ({len(result)} records)')
    return result

  async def getSubDistricts(self, state_code, district):
    """Alias for getBlock — the new portal uses blocks, not sub-districts."""
    return await self.getBlock(state_code, district)

  async def getBlock(self, state_code, district):
    """Return blocks for a district using the GraphQL API, with local cache.

    Cache key  : district MongoDB _id
    Cache file : data/geo_cache/blocks/<district_id>.json
    TTL        : 30 days

    'district' is the MongoDB _id returned by getDistricts.
    'state_code' is the numeric string used to resolve the state gql_id.
    """
    cached = geo_cache.get_blocks(district)
    if cached is not None:
        logging.info(f'geo_cache HIT: blocks for district {district} ({len(cached)} records)')
        return cached

    state_gql_id = _resolve_gql_id(state_code, self.states)
    data = _gql(
        'query GetBlocks($state: ID, $district: ID) {'
        '  getBlocks(state: $state, district: $district) { _id name code }'
        '}',
        {'state': state_gql_id, 'district': district},
    )
    records = data.get('getBlocks') or []
    result = [
        {'name': r['name'], 'id': r['_id'], 'code': r.get('code', '')}
        for r in records
    ]
    geo_cache.set_blocks(district, result)
    logging.info(f'geo_cache SET: blocks for district {district} ({len(result)} records)')
    return result

  async def getVillages(self, state, district, subDistrict):
    """Return villages for a block using the GraphQL API, with local cache.

    Cache key  : block MongoDB _id
    Cache file : data/geo_cache/villages/<block_id>.json
    TTL        : 7 days (villages added less rarely than districts/blocks)

    state       — numeric state code string (e.g. '6')
    district    — MongoDB _id of the district (from getDistricts)
    subDistrict — MongoDB _id of the block (from getBlock)
    """
    cached = geo_cache.get_villages(subDistrict)
    if cached is not None:
        logging.info(f'geo_cache HIT: villages for block {subDistrict} ({len(cached)} records)')
        return cached

    state_gql_id = _resolve_gql_id(state, self.states)
    data = _gql(
        'query GetVillages($state: String, $district: ID, $block: String) {'
        '  getVillageBydistrict(state: $state, district: $district, block: $block) {'
        '    _id name code status'
        '  }'
        '}',
        {'state': state_gql_id, 'district': district, 'block': subDistrict},
    )
    records = data.get('getVillageBydistrict') or []
    result = [
        {
            'name':        r['name'],
            'id':          r['_id'],
            'code':        r.get('code', ''),
            'state_id':    state,
            'district_id': district,
            'mandal_id':   subDistrict,
        }
        for r in records
        if r.get('status') != 'Uninhabited'   # skip non-agricultural villages
    ]
    geo_cache.set_villages(subDistrict, result)
    logging.info(f'geo_cache SET: villages for block {subDistrict} ({len(result)} records)')
    return result


  async def _selectState(self, state):
    await self.page.select('#State_cd2', state)
    await self.page.waitForFunction("document.getElementById('Dist_cd2').length > 1")

  async def _selectDistrict(self, district):
    await self.page.select('#Dist_cd2', district)
    await self.page.waitForFunction("document.getElementById('Sub_dis2').length > 1")

  async def _selectMandal(self, mandal):
    await self.page.select('#Sub_dis2', mandal)
    await self.page.waitForFunction("document.getElementById('village_cd2').length > 1")

  async def _selectVillage(self, village):
    await self.page.select('#village_cd2', village)

  async def _search(self):
    search_button = await self.page.J('#tb_serch > tr:nth-child(8) > td > a:nth-child(1)')
    await search_button.click()
    await self.page.waitFor(2000)

  async def getCards(self, state, district, subdistrict, village):
    utils.logText(f"retrieving cards for village {village}")
    state_endpoint = self.states[state]['endpoint']

    #await self.page.setRequestInterception(True)
    #self.page.on('request', lambda req: asyncio.ensure_future(req_intercept(req)))
    print(f"Init page {state_endpoint}/HealthCard/HealthCard/HealthCardPNew")
    await self.page.setCacheEnabled(False)
    self.page.setDefaultNavigationTimeout(30000)
    await self.page.goto("https://www.google.com")
    await self.page.goto(f"{state_endpoint}/HealthCard/HealthCard/HealthCardPNew")
    await self._selectState(state)
    await self._selectDistrict(district)
    await self._selectMandal(subdistrict)
    await self._selectVillage(village)
    await self._search()

    token = await self.page.Jeval('#forgeryToken', 'el => el.value')
    sessionCookie = ""
    cookies = await self.page.cookies()
    for cookie in cookies:
      if cookie["name"] == "ASP.NET_SessionId":
        sessionCookie = cookie["value"]
        
    samples = set()
    results = []
    stop = False
    page = 1

    while stop is False:
      timestamp = int(time.time()) 
      url = f'{state_endpoint}/HealthCard/HealthCard/SearchInGridP?S_District_Sample_number=&S_Financial_year=&GetSampleno=&Fname=&Statecode={state}&block=&discode={district}&subdiscode={subdistrict}&village={village}&Source_Type=&Date_Recieve=&VerificationToken={token}&_={timestamp}&page={page}'
      url = url.replace("http://","https://")

      print(f"processing page {page} with {url}")
      retry_strategy = Retry(
          total=10,
          backoff_factor=2
      )
      adapter = HTTPAdapter(max_retries=retry_strategy)
      http = requests.Session()
      http.mount("https://", adapter)
      http.mount("http://", adapter)

      r = http.get(url, headers={
        "x-requested-with": "XMLHttpRequest"
      }, cookies={
        "ASP.NET_SessionId": sessionCookie
      }, timeout=10)
      soup = BeautifulSoup(r.text, 'html.parser')
      rows = soup.find('tbody').find_all("tr")
      if len(rows) >0:
        for row in rows:
          cols = row.find_all('td')
          sample_text = cols[0].text
          village_grid_text = cols[1].text
          srno_text = cols[2].text
          district_text = cols[4].text
          mandal_text = cols[5].text
          district_text = cols[6].text
          village_text = cols[7].text
           
          if sample_text+srno_text in samples:
            stop = True
            break
          samples.add(sample_text+srno_text)
          srno_text = int(srno_text)
                
          results.append({
              'sample': sample_text,
              'village_grid': village_grid_text,
              'sr_no': srno_text,
              'district': district_text,
              'mandal': mandal_text,
              'village': village_text,
              'state_id': state,
              'district_id': district,
              'mandal_id': subdistrict,
              'village_id': village
          })
      else:
        stop = True
        break
      page = page + 1
    return results

  async def _pageHasMoreThanOneRow(self):
    sample_element = await self.page.J(F'#MainTable > tbody > tr:nth-child(2) > td:nth-child(1)')
    if sample_element:
      return True 
    else:
      return False

  async def getCard(self, state, sample_no, village_grid, sr_no):
    utils.logText(f"downloading card {sample_no} {sr_no}")
    Language_Code= "99"
    ShcValidityDateFrom= "NULL"
    ShcValidityDateTo= "NULL"
    shcformate= "NewFormat"
    state_endpoint = self.states[state]['endpoint']
    url = f'{state_endpoint}/HealthCard/HealthCard/HealthCardNewPartialP?Language_Code={Language_Code}&Sample_No={urllib.parse.quote(sample_no,safe="")}&ShcValidityDateFrom={ShcValidityDateFrom}&ShcValidityDateTo={ShcValidityDateTo}&Sr_No={sr_no}&Unit_Code=17&shcformate={shcformate}'
    print(f"Loading sample url {url}")
    counter = 1
    while counter < 5:
        try:
          try:
            report_html = await self._getCardInner(self.page, counter, url)
            if len(report_html) > 60*1024:
              #await page.close()
              return report_html
          except pyppeteer.errors.TimeoutError:
            logging.exception(f"error downloading card {sample_no} {sr_no}")
            #await page.close()
            raise pyppeteer.errors.TimeoutError
        except pyppeteer.errors.TimeoutError:
            counter = counter + 1
     
    raise UnableToDownloadCard

  async def _getCardInner(self, page, counter, url):
    await page.goto(url)
    try:
      await page.waitForFunction("document.querySelector('body > iframe').contentWindow.document.querySelector('#form1 > div:nth-child(3) > div') != null" , { 'timeout': 30000 })
      await page.waitForFunction("document.querySelector('body > iframe').contentWindow.document.querySelector('#form1 > div:nth-child(3) > div').textContent == ' Report server is being updated. Please try later...'" , { 'timeout': 30000 })
      raise ReportServerUpdating()
    except pyppeteer.errors.TimeoutError:
      utils.logText("Report Server is not updating")

    await page.waitForFunction("document.querySelector('body > iframe') != null")   
    await page.waitForFunction("document.querySelector('body > iframe').contentWindow != null")  
    await page.waitForFunction("document.querySelector('body > iframe').contentWindow.document != null")  
    await page.waitForFunction("document.querySelector('body > iframe').contentWindow.document.querySelector('#VisibleReportContentReportViewer1_ctl09') != null")    
    await page.waitForFunction("document.querySelector('body > iframe').contentWindow.document.querySelector('#VisibleReportContentReportViewer1_ctl09').children.length > 0",  {'timeout': 120000 })

    iframe = await (await page.J('body > iframe')).contentFrame()
    return await iframe.content()

async def fetchCard(card, overwrite):
    utils.logText(f"downloading card {card} {overwrite}")
    shc_dl = ShcDL()
    await shc_dl.setup()
    shc = ""
    file_path = storage.getFilePath(card['state_id'], card['district_id'], card['mandal_id'], card['village_id'], card['sample'], card['sr_no'])
    if not storage.isFileDownloaded(file_path) or overwrite == "true":
        counter = 5
        try:
          while shc == "" and counter > 0:
              try:
                  shc = await shc_dl.getCard(card['state_id'], card['sample'], card['village_grid'], card['sr_no'])
              except pyppeteer.errors.TimeoutError:
                  counter = counter - 1
                  if counter == 0:
                    await shc_dl.close()
                    raise UnableToDownloadCard
              except UnableToDownloadCard:
                  counter = counter - 1
                  if counter == 0:
                    await shc_dl.close()
                    raise UnableToDownloadCard
          if len(shc) > 60*1024:
              storage.uploadFile(file_path, shc, {
                  'state': card['state_id'].strip(),
                  'district':  card['district'].strip(),
                  'district_code': card['district_id'].strip(),
                  'mandal': card['mandal'].strip(),
                  'mandal_code': card['mandal_id'].strip(),
                  'village':  card['village'].strip(),
                  'village_code': card['village_id'].strip(),
              })
          else:
              utils.logText(f'failed downloading file {file_path}') 
        except ReportServerUpdating:
          utils.logText(f'File {file_path} cant be downloaded at the moment, the report server is down') 
          await shc_dl.close()
          raise ReportServerUpdating
          
    else:
        utils.logText(f'skipping file {file_path} since its already downloaded') 
    await shc_dl.close()
    return shc

def ingestMetadata():
  shc = ShcDL()
  asyncio.run(shc.setup())
  states = asyncio.run(shc.getStates())
  for state in states:
    districts = asyncio.run(shc.getDistricts(state['id']))
    if len(districts) > 0:
      errors = []
      if errors == []:
          print("New rows have been added.")
      else:
          print("Encountered errors while inserting rows: {}".format(errors))
      for district in districts:
        subdistricts = asyncio.run(shc.getSubDistricts(state['id'],district['id']))
        if len(subdistricts) > 0:
          errors = []
          if errors == []:
              print("New rows have been added.")
          else:
              print("Encountered errors while inserting rows: {}".format(errors))
          for subdistrict in subdistricts:
            villages = asyncio.run(shc.getVillages(state['id'], district['id'], subdistrict['id']))
            if len(villages) > 0:
              errors = []
              if errors == []:
                  print("New rows have been added.")
              else:
                  print("Encountered errors while inserting rows: {}".format(errors))