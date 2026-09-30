"""
LOCAL VERSION of main.py

Same 4 modes as the original (INGEST / CARDS / SCRAPE / EXTRACT), but:
  - Uses local_db (SQLite) instead of Cloud Spanner
  - Uses storage.py (local disk) instead of GCS
  - No GKE/parallelism required -- runs as a single local process
  - Added: --state filter (accepts a comma-separated list, e.g. "7,6"), so
    you scope your run to specific state(s) instead of accidentally
    targeting all of India
  - Added: a politeness delay between requests (be a good citizen to a
    public government server)
  - Added: --max-storage-mb, a hard cap on data/ folder size. SCRAPE checks
    disk usage before every download and stops cleanly once the cap is hit
    (rather than you having to babysit `du -sh` yourself)
  - Added: --near-lat / --near-lon / --near-radius-km on EXPORT, to filter
    the final CSV down to samples near a specific point (defaults to NIT
    Delhi's coordinates)

CONTEXT: tuned for a hackathon at NIT Delhi (Narela, North Delhi --
28.85 N, 77.09 E), which sits right on the Delhi/Haryana border. Delhi as
a Union Territory is overwhelmingly urban, so real farmland (and therefore
real Soil Health Card coverage) near the venue is likely concentrated at
the northern fringe and just across the border into Haryana's Sonipat
district -- hence the default is Delhi (7) AND Haryana (6) together,
narrowed back down to venue-relevant samples at EXPORT time via the
--near-lat/--near-lon/--near-radius-km filter rather than by state
boundary alone.

USAGE:
    python local_main.py INGEST --state 7,6           # Delhi UT + Haryana
    python local_main.py CARDS                          # list available cards for ingested villages
    python local_main.py SCRAPE --max-storage-mb 500     # download HTML reports, stop at 500MB
    python local_main.py EXTRACT                          # parse HTML -> structured Cards_info rows
    python local_main.py EXPORT --out shc_nit_delhi.csv   # dump Cards_info to CSV, filtered near NIT Delhi

State IDs (from scraper.offlineStates()): run `python local_main.py LIST-STATES`
"""

import argparse
import asyncio
import csv
import json
import math
import os
import random
import time

os.environ.setdefault('RUN_LOCALLY', '1')  # tells scraper.py/utils.py to use local-friendly paths

import scraper
import storage
import local_db
from local_card_extractor import LocalCardExtractor

REQUEST_DELAY_SECONDS = float(os.environ.get('SHC_REQUEST_DELAY', '1.5'))

# Known hackathon / demo venue coordinates.
# Pass --near-lat / --near-lon explicitly to EXPORT to override.
# Default (no flags) = NIT Delhi.
NIT_DELHI_LAT = 28.85    # NIT Delhi, Narela, Delhi-110040
NIT_DELHI_LON = 77.09

MUJ_LAT = 26.843          # Manipal University Jaipur, Dehmi Kalan, Sanganer, Jaipur
MUJ_LON = 75.565

shc_dl = None
village_view_cache = {}


def _haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def _sleep_politely():
    time.sleep(REQUEST_DELAY_SECONDS + random.uniform(0, 0.5))


class StorageCapReached(Exception):
    pass


def get_dir_size_mb(path):
    """Walks `path` and returns its total size in MB. Cheap enough to call
    before every download (low thousands of files at most for any sane
    --limit), but we still only call it once per card, not per file."""
    total_bytes = 0
    if not os.path.exists(path):
        return 0.0
    for dirpath, _dirnames, filenames in os.walk(path):
        for fname in filenames:
            fpath = os.path.join(dirpath, fname)
            try:
                total_bytes += os.path.getsize(fpath)
            except OSError:
                pass  # file vanished mid-walk, ignore
    return total_bytes / (1024 * 1024)


def _check_storage_cap(max_storage_mb):
    """Raises StorageCapReached if data/ is already at/over the cap.
    Called BEFORE each download so we never blow past the cap mid-write."""
    if max_storage_mb is None:
        return
    current_mb = get_dir_size_mb(storage.DATA_ROOT)
    if current_mb >= max_storage_mb:
        raise StorageCapReached(
            f"data/ is {current_mb:.1f}MB, at or above your --max-storage-mb "
            f"{max_storage_mb}MB cap. Stopping cleanly -- nothing corrupted, "
            f"just re-run EXTRACT/EXPORT on what you've got, or raise the cap "
            f"and re-run SCRAPE to continue."
        )


# --------------------------------------------------------------------------
# MODE: INGEST  (states -> districts -> subdistricts -> villages)
# --------------------------------------------------------------------------

async def ingest(state_filter=None):
    global shc_dl

    # ── Pre-flight: check the GraphQL backend is actually serving data ────────
    # The gateway (__typename) can be up while the MongoDB-backed microservice
    # is down (common during overnight maintenance on government servers).
    # Checking this before launching Chrome saves ~30s of wasted retries.
    print("Checking GraphQL backend availability...")
    if scraper._gql_backend_is_up():
        # Gateway responds to __typename — now probe a real data resolver.
        # Use getState for Haryana (code 6) whose gql_id we already know.
        try:
            test = scraper._gql(
                'query { getState(code: "6") { _id name } }',
                retries=1,
            )
            if not test.get('getState'):
                raise RuntimeError("empty response")
            print("GraphQL backend OK.\n")
        except RuntimeError as e:
            print(
                f"\nERROR: GraphQL backend is up but data resolvers are not responding.\n"
                f"  This typically means the government server is in a maintenance\n"
                f"  window (common overnight IST, ~11 PM – 6 AM).\n"
                f"  Current IST time: {scraper._ist_now()}\n"
                f"  Try again in 30–60 minutes.\n"
                f"  Detail: {e}"
            )
            return
    else:
        print(
            f"\nERROR: Cannot reach soilhealth4.dac.gov.in.\n"
            f"  Check your internet connection and try again.\n"
            f"  IST time: {scraper._ist_now()}"
        )
        return

    shc_dl = scraper.ShcDL()
    await shc_dl.setup()
    await shc_dl.newPage()

    print("Loading States")
    states = [s for _, s in scraper.offlineStates().items()]
    states = sorted(states, key=lambda s: int(s["id"]))
    local_db.insertStates(states)

    if state_filter:
        # Accepts a single id ("7") or a comma-separated list ("7,6") so you
        # can pull Delhi UT plus a bordering Haryana district in one run.
        wanted_ids = {s.strip() for s in str(state_filter).split(',') if s.strip()}
        matched = [s for s in states if s["id"] in wanted_ids]
        missing_ids = wanted_ids - {s["id"] for s in matched}
        if missing_ids:
            print(f"WARNING: state id(s) {sorted(missing_ids)} not found -- skipping. "
                  f"Run LIST-STATES to see valid ids.")
        if not matched:
            print("No valid state ids given. Aborting.")
            return
        states = matched

    for state in states:
        print(f"\n=== State {state['id']} ({state['name']}) ===")
        districts = await shc_dl.getDistricts(state["id"])
        _sleep_politely()
        districts = sorted(districts, key=lambda d: d["name"])  # sort by name; IDs are now MongoDB hex strings
        if not districts:
            continue
        local_db.insertDistricts(state["id"], districts)

        for district in districts:
            print(f"  District {district['id']} ({district['name']})")
            subDistricts = await shc_dl.getSubDistricts(state["id"], district["id"])
            _sleep_politely()
            subDistricts = sorted(subDistricts, key=lambda sd: sd["name"])
            if not subDistricts:
                continue
            local_db.insertSubDistricts(district["id"], subDistricts)

            for subDistrict in subDistricts:
                villages = await shc_dl.getVillages(state["id"], district["id"], subDistrict["id"])
                _sleep_politely()
                if villages:
                    local_db.insertVillages(subDistrict["id"], villages)
                    print(f"    SubDistrict {subDistrict['id']} ({subDistrict['name']}): "
                          f"{len(villages)} villages")

    await shc_dl.close()
    print("\nIngest complete. Run: python local_main.py CARDS")


# --------------------------------------------------------------------------
# MODE: CARDS  (find which sample cards exist per village)
# --------------------------------------------------------------------------

async def ingestCards(limit_villages=None):
    global shc_dl
    shc_dl = scraper.ShcDL()
    await shc_dl.setup()

    count = local_db.count_villages_pending_cards()
    if count < 1:
        print("No pending villages -- run INGEST first, or everything is already listed.")
        await shc_dl.close()
        return

    fetch_count = min(count, limit_villages) if limit_villages else count
    print(f"{count} villages pending card listing. Fetching {fetch_count} this run.")

    rows = local_db.get_villages_pending_cards(fetch_count, 0)
    for VillageId, SubDistrictId, DistrictId, StateId in rows:
        print(f"Listing cards for village {VillageId} "
              f"(state {StateId}, district {DistrictId}, subdistrict {SubDistrictId})")
        cards = await shc_dl.getCards(str(StateId), str(DistrictId), str(SubDistrictId), str(VillageId))
        _sleep_politely()
        local_db.insertCards(VillageId, cards)
        local_db.markVillage(int(VillageId), True)
        print(f"  -> {len(cards)} cards found")

    await shc_dl.close()
    print("\nCard listing complete. Run: python local_main.py SCRAPE")


# --------------------------------------------------------------------------
# MODE: SCRAPE  (download the actual HTML report per card)
# --------------------------------------------------------------------------

def get_village_view(VillageId):
    if VillageId in village_view_cache:
        return village_view_cache[VillageId]
    info = local_db.get_village_view(VillageId)
    village_view_cache[VillageId] = info
    return info


async def scrapeCards(limit_cards=None, max_storage_mb=None):
    count = local_db.count_uningested_cards()
    if count < 1:
        print("No uningested cards -- run CARDS first.")
        return

    fetch_count = min(count, limit_cards) if limit_cards else count
    print(f"{count} cards pending download. Fetching up to {fetch_count} this run.")
    if max_storage_mb:
        current_mb = get_dir_size_mb(storage.DATA_ROOT)
        print(f"data/ is currently {current_mb:.1f}MB. Cap: {max_storage_mb}MB.")

    rows = local_db.get_uningested_cards(fetch_count, 0)
    downloaded = 0
    for VillageId, Sample, VillageGrid, SrNo in rows:
        try:
            _check_storage_cap(max_storage_mb)
        except StorageCapReached as e:
            print(f"\n🛑 {e}")
            break

        view = get_village_view(VillageId)
        card = {
            "sample": Sample,
            "village_grid": VillageGrid,
            "sr_no": str(SrNo),
            "district": view.get("district"),
            "mandal": view.get("mandal"),
            "village": view.get("village"),
            "state_id": view.get("state_id"),
            "state": view.get("state"),
            "district_id": view.get("district_id"),
            "mandal_id": view.get("mandal_id"),
            "village_id": str(VillageId),
        }
        print(f"Downloading card {Sample} / sr_no {SrNo} (village {VillageId})")
        try:
            await scraper.fetchCard(card, False)
            local_db.markCard(int(VillageId), Sample, int(SrNo), True)
            downloaded += 1
        except Exception as e:
            print(f"  !! failed: {e} -- will retry on next run")
        _sleep_politely()

    final_mb = get_dir_size_mb(storage.DATA_ROOT)
    print(f"\nDownloaded {downloaded} cards this run. data/ is now {final_mb:.1f}MB.")
    print("Run: python local_main.py EXTRACT")


# --------------------------------------------------------------------------
# MODE: EXTRACT  (parse downloaded HTML -> structured Cards_info rows)
# --------------------------------------------------------------------------

def load_india_shape():
    from shapely import geometry
    path = os.path.join(os.path.dirname(__file__), 'testdata', 'india_shape.geojson')
    with open(path, 'r') as f:
        gj = json.load(f)
    return geometry.shape(gj['features'][0]['geometry'])


def extractCards(limit_cards=1000):
    india_shape = load_india_shape()
    rows = local_db.get_cards_ready_to_extract(limit_cards, 0)
    print(f"{len(rows)} cards ready to extract this run.")

    extracted = 0
    for VillageId, Sample, VillageGrid, SrNo, extract_attempt in rows:
        view = get_village_view(VillageId)
        card = {
            "sample": Sample,
            "village_grid": VillageGrid,
            "sr_no": str(SrNo),
            "village_id": str(VillageId),
            "extract_attempt": extract_attempt,
        }
        card.update(view)

        print(f"Extracting card {Sample} / sr_no {SrNo} (village {VillageId})")
        try:
            extractor_obj = LocalCardExtractor(card, india_shape=india_shape)
            if extractor_obj.extract_card(False):
                local_db.markCardExtracted(int(VillageId), Sample, int(SrNo), True)
                extracted += 1
        except Exception as e:
            print(f"  !! extraction failed: {e}")

    print(f"\nExtracted {extracted}/{len(rows)} cards this run.")
    print("Run again to process more, or: python local_main.py EXPORT --out my_data.csv")


# --------------------------------------------------------------------------
# MODE: EXPORT  (dump Cards_info to a flat CSV for pandas/your NPK pipeline)
# --------------------------------------------------------------------------

def export_csv(out_path, near_lat=None, near_lon=None, near_radius_km=None):
    """
    Dump Cards_info to CSV. If near_lat/near_lon are given, only rows with
    valid coordinates within near_radius_km of that point are included --
    lets you scope a Delhi+Haryana-wide scrape down to just what's
    demo-relevant near the hackathon venue, rather than exporting
    everything you happened to ingest.
    """
    conn = local_db.get_conn()
    cursor = conn.execute("SELECT * FROM Cards_info")
    cols = [d[0] for d in cursor.description]
    rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
    conn.close()

    total = len(rows)

    if near_lat is not None and near_lon is not None:
        lat_idx = cols.index('latitude')
        lon_idx = cols.index('longitude')
        filtered = []
        skipped_no_coords = 0
        for row in rows:
            lat, lon = row.get('latitude'), row.get('longitude')
            if lat is None or lon is None or (lat == 0 and lon == 0):
                skipped_no_coords += 1
                continue
            dist = _haversine_km(near_lat, near_lon, lat, lon)
            if dist <= near_radius_km:
                row['_distance_km'] = round(dist, 2)
                filtered.append(row)
        rows = sorted(filtered, key=lambda r: r['_distance_km'])
        cols = cols + ['_distance_km']
        print(f"Proximity filter: {total} total rows -> {skipped_no_coords} missing coordinates "
              f"-> {len(rows)} within {near_radius_km}km of ({near_lat}, {near_lon})")

    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=cols)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Exported {len(rows)} rows -> {out_path}")


# --------------------------------------------------------------------------
# Helper mode
# --------------------------------------------------------------------------

def list_states():
    states = scraper.offlineStates()
    for sid, s in sorted(states.items(), key=lambda kv: int(kv[0])):
        print(f"  {sid:>3}  {s['name']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Local Soil Health Card scraper")
    parser.add_argument(
        "mode",
        choices=["INGEST", "CARDS", "SCRAPE", "EXTRACT", "EXPORT", "LIST-STATES", "PING"],
    )
    parser.add_argument("--state",
                        help="State id(s) to scope INGEST to, comma-separated for multiple "
                             "(recommended! e.g. 7,6 = Delhi UT + Haryana)",
                        default=None)
    parser.add_argument("--limit", type=int, default=None,
                        help="Max villages/cards to process this run (for CARDS/SCRAPE/EXTRACT)")
    parser.add_argument("--max-storage-mb", type=float, default=None,
                        help="Stop SCRAPE cleanly once data/ reaches this size in MB. "
                             "Checked before every download, so you never blow past it. "
                             "Example: --max-storage-mb 500")
    parser.add_argument("--out", default="shc_export.csv", help="Output CSV path for EXPORT")
    parser.add_argument("--near-lat", type=float, default=None,
                        help="EXPORT only: latitude to filter near. Defaults to NIT Delhi "
                             f"({NIT_DELHI_LAT}) if --near-radius-km is set but --near-lat isn't.")
    parser.add_argument("--near-lon", type=float, default=None,
                        help="EXPORT only: longitude to filter near. Defaults to NIT Delhi "
                             f"({NIT_DELHI_LON}) if --near-radius-km is set but --near-lon isn't.")
    parser.add_argument("--near-radius-km", type=float, default=None,
                        help="EXPORT only: only include samples within this many km of "
                             "--near-lat/--near-lon. Example: --near-radius-km 15")
    args = parser.parse_args()

    if args.mode == "PING":
        # Quick health check — no browser, no DB, just the GraphQL backend.
        import sys
        print(f"IST time: {scraper._ist_now()}")
        print("Checking GraphQL gateway (__typename)... ", end="", flush=True)
        gateway_up = scraper._gql_backend_is_up()
        print("UP" if gateway_up else "DOWN")
        if gateway_up:
            print("Checking data resolver (getState)...    ", end="", flush=True)
            try:
                result = scraper._gql(
                    'query { getState(code: "6") { _id name } }',
                    retries=1,
                )
                if result.get('getState'):
                    print("UP")
                    print("\nBackend is fully operational. Run INGEST.")
                else:
                    print("DOWN (empty response)")
                    print("\nBackend resolver returned empty. Try again in a few minutes.")
            except RuntimeError:
                print("DOWN")
                print("\nBackend data resolvers are not responding.")
                print("The government server may be in a maintenance window.")
                print("Try again later (typically recovers during IST business hours).")
                sys.exit(1)
        else:
            print("\nCannot reach soilhealth4.dac.gov.in. Check your internet connection.")
            sys.exit(1)
    elif args.mode == "LIST-STATES":
        list_states()
    elif args.mode == "INGEST":
        if not args.state:
            print("WARNING: no --state given. This will attempt ALL of India, which will")
            print("take a very long time and hit the government server heavily.")
            print("Example of scoping instead: --state 7,6   (Delhi UT + Haryana)")
            confirm = input("Type YES to proceed with all of India, or Ctrl+C to cancel: ")
            if confirm.strip() != "YES":
                exit(0)
        asyncio.run(ingest(state_filter=args.state))
    elif args.mode == "CARDS":
        asyncio.run(ingestCards(limit_villages=args.limit))
    elif args.mode == "SCRAPE":
        asyncio.run(scrapeCards(limit_cards=args.limit, max_storage_mb=args.max_storage_mb))
    elif args.mode == "EXTRACT":
        extractCards(limit_cards=args.limit or 1000)
    elif args.mode == "EXPORT":
        near_lat, near_lon = args.near_lat, args.near_lon
        if args.near_radius_km is not None:
            if near_lat is None:
                near_lat = NIT_DELHI_LAT
            if near_lon is None:
                near_lon = NIT_DELHI_LON
        export_csv(args.out, near_lat=near_lat, near_lon=near_lon,
                  near_radius_km=args.near_radius_km)
