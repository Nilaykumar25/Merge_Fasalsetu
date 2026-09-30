# Local Soil Health Card Scraper — Run Guide

This is a **locally-runnable fork** of `google-research-datasets/india-soil-health-card`.

The original repo requires Google Cloud Spanner + Cloud Storage + GKE to run.
This fork swaps those for **SQLite** and **your local disk**, so you can run it
on your own laptop with no GCP project, no billing, and no Terraform.

**Everything else is the original code, untouched**: the actual scraping logic
(`scraper.py`), the HTML parsing logic (`extractor/`, `card_info_parser.py`),
and the protobuf schema (`protos/`) are copied directly from Google's repo.

---

## Hackathon Venue Note (NIT Delhi)

This fork is tuned for a hackathon at **NIT Delhi** (Sector A-7, Narela,
North Delhi — 28.85°N, 77.09°E), which sits right on the Delhi/Haryana
border. Delhi as a Union Territory is overwhelmingly urban, so real
Soil Health Card coverage right around the venue may be sparse. Two things
in this fork exist specifically because of that:

- `--state` accepts a comma-separated list, so `--state 7,6` pulls **both**
  Delhi UT and Haryana in one run, giving you a real shot at farmland
  samples near the border rather than being limited to Delhi's own
  (likely thin) rural fringe.
- `EXPORT` has `--near-lat`/`--near-lon`/`--near-radius-km`, which
  **default to NIT Delhi's coordinates**, so you can scrape a wider
  Delhi+Haryana area and then narrow the final CSV down to only what's
  actually demo-relevant near the venue.

---

## ⚠️ Before You Run This

1. **This hits a real Indian government server** (`soilhealth.dac.gov.in`).
   Be a good citizen:
   - This fork adds a **1.5-2 second delay between every request** by default
     (`SHC_REQUEST_DELAY` env var if you want to tune it — please don't set it
     to 0).
   - **Always scope your first runs with `--state` and `--limit`.** Don't try
     to pull all of India on your first attempt.
   - The original repo's own code handles a `"Report server is being updated"`
     error state — this portal is known to be slow/flaky. Expect failures and
     retries; that's normal, not a bug in this fork.

2. **I (Claude) cannot run this for you.** My sandbox's network is locked to
   an allowlist of package registries (pypi, npm, github, etc.) —
   `soilhealth.dac.gov.in` isn't on it, confirmed by testing
   (`x-deny-reason: host_not_allowed`). Everything below has been verified
   to import and run correctly *offline* (SQLite schema, CLI, state list,
   module wiring) — but the actual network scraping has to happen on
   **your machine**.

3. **Legal/ethical note:** Soil Health Card data is explicitly published by
   the Indian government as a public farmer-facing service — this isn't a
   paywalled or private system. Still, scrape respectfully (rate-limit,
   don't parallelize aggressively, don't resell the data) and check
   `soilhealth.dac.gov.in`'s terms of use before large-scale collection.

---

## Setup

```bash
cd shc-local-scraper

python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
# First run of pyppeteer auto-downloads its own bundled Chromium (~150MB,
# one-time). No system Chromium install needed.
```

---

## Usage — 4 Steps, In Order

### Step 0: See available states
```bash
python local_main.py LIST-STATES
```

### Step 1: INGEST — build the state → district → subdistrict → village tree
**Always pass `--state` for your first run.** `--state` accepts a comma-
separated list, which matters here: Delhi (id 7) is a Union Territory and
overwhelmingly urban, so real Soil Health Card coverage right around a
Delhi venue is likely to be sparse. NIT Delhi's campus (Narela) sits right
on the Delhi/Haryana border, so pulling Delhi UT **and** Haryana together
gives you a realistic shot at actual farmland samples near the venue:

```bash
python local_main.py INGEST --state 7,6
```

(7 = Delhi, 6 = Haryana — confirm anytime with `LIST-STATES`.)

Walks the government portal's dropdown menus and populates
`data/shc_metadata.db` with every village in that state. For a big state this
can be thousands of villages — may take a while even scoped to one state.

### Step 2: CARDS — list which soil sample cards exist per village
```bash
python local_main.py CARDS --limit 50
```

`--limit` caps how many villages to process *this run* — the tool is
resumable, so just run it again to continue (checkpointing is automatic,
same as the original).

### Step 3: SCRAPE — download the actual HTML soil health card reports
```bash
python local_main.py SCRAPE --limit 50 --max-storage-mb 500
```

Downloads land in `data/shcs/<state>/<district>/<mandal>/<village>/*.html`.
This is the slowest step (headless browser navigation per card) — expect
several seconds per card.

`--max-storage-mb` is a hard safety cap: before every single download, the
tool measures the current size of `data/` and stops cleanly (no partial
writes, fully resumable) the moment it would cross that threshold. You don't
need to babysit `du -sh` yourself — just set a cap you're comfortable with
and walk away.

### Step 4: EXTRACT — parse HTML into structured fields
```bash
python local_main.py EXTRACT --limit 200
```

Pulls N/P/K/pH/EC/OC/micronutrient values out of the raw HTML into
`data/shc_metadata.db`'s `Cards_info` table, using Google's original
`ShcHtmlExtractor` + `CardInfoParser` logic verbatim.

### Step 5: EXPORT — get a CSV you can actually use
```bash
python local_main.py EXPORT --out shc_nit_delhi.csv --near-radius-km 15
```

`--near-radius-km` filters the export down to samples within that many km
of a center point — **defaults to NIT Delhi's coordinates (28.85, 77.09)**
if you don't pass `--near-lat`/`--near-lon` explicitly, so the flag above
alone scopes your export to venue-relevant samples even if you ingested a
wider Delhi+Haryana area. Rows with missing/invalid coordinates are
dropped from a filtered export and reported in the console output. Omit
`--near-radius-km` entirely to export everything with no distance filter.

To center on somewhere else instead:
```bash
python local_main.py EXPORT --out shc_export.csv \
    --near-lat 28.70 --near-lon 77.10 --near-radius-km 20
```

Flat CSV, one row per soil sample, columns including:

```
N_value, N_unit, N_rating, N_min_normal_level, N_max_normal_level,
P_value, P_unit, P_rating, ...
K_value, K_unit, K_rating, ...
pH_value, EC_value, OC_value, S_value, Zn_value, B_value, Fe_value,
Mn_value, Cu_value, latitude, longitude, farm_size, irrigation_method,
soil_type, sample_collection_date
```

Load straight into pandas for your NPK research validation work.

---

## How Much Disk Space Will This Use?

The original code discards anything under 60KB as a failed download, so each
saved card is realistically ~100-150KB (HTML) + a few KB (extracted JSON).

| Scope | Approx. cards | Storage estimate |
|---|---|---|
| Pilot run (5 villages) | 20-100 cards | 3-15 MB |
| One subdistrict | a few hundred | ~50-100 MB |
| One district | a few thousand | ~500 MB - 1 GB |
| Delhi UT alone | likely low tens of thousands, but expect gaps -- Delhi is mostly urban and may have limited SHC coverage outside its rural fringe (Narela, Najafgarh, etc.) | probably under 1 GB, coverage caveat matters more than size here |
| One full state (e.g. Haryana) | tens of thousands | several GB |
| All of India | 2.53 crore samples nationally | ~2.5-4 TB |

Use `--max-storage-mb` on the SCRAPE step (see above) to enforce a hard cap
so you never have to worry about this in practice.

---

## Recommended First Run (Small Pilot)

Don't go big on your first attempt — validate the pipeline end-to-end on a
tiny slice first:

```bash
python local_main.py INGEST --state 7,6            # Delhi UT + Haryana
python local_main.py CARDS --limit 5              # just 5 villages
python local_main.py SCRAPE --limit 20 --max-storage-mb 100   # small cap, belt-and-suspenders
python local_main.py EXTRACT --limit 20
python local_main.py EXPORT --out pilot_test.csv --near-radius-km 25
```

The 25km radius here is intentionally generous — with only 5 villages
ingested you may not have anything within a tighter 15km of NIT Delhi yet.
Tighten it back down once you've scraped a wider area.

Open `pilot_test.csv` and sanity-check the N/P/K values look like real lab
numbers (not all zero, not all identical, reasonable mg/kg-scale ranges)
before scaling up.

---

## Resuming / Re-running

Every stage is checkpointed in SQLite (`data/shc_metadata.db`), mirroring the
original Spanner-based checkpointing. If interrupted, or you hit a "Report
server is being updated" error, just re-run the same command — completed
villages/cards are skipped automatically.

To start completely fresh:
```bash
rm -rf data/
```

---

## Troubleshooting

**"Report server is being updated. Please try later..."**
The government portal itself being flaky — handled in the original code's
`ReportServerUpdating` exception, not a bug in this fork. Wait and re-run.

**pyppeteer hangs or times out on first launch**
First run downloads Chromium (~150MB). Ensure a stable connection and free
disk space. If stuck, delete the pyppeteer local-chromium cache and retry.

**Getting mostly empty/failed extractions**
The site's HTML may have drifted since Google last maintained this repo
(archived March 2026). If `EXTRACT` runs but `Cards_info` rows come back
mostly null, the CSS selectors in `extractor/shc_html_extractor.py` or
`extractor/html_parser_utils.py` may need small updates to match the current
page structure — open one saved HTML file from `data/shcs/` in a browser and
compare it against what the extractor expects.

**Want to go faster / bigger**
Increase `--limit` values once you trust the pipeline. You can lower
`SHC_REQUEST_DELAY` slightly (e.g. `export SHC_REQUEST_DELAY=1.0`), but keep
some delay — this is a shared government server, not your infrastructure.

---

## File Reference

| File | Role | Origin |
|---|---|---|
| `local_main.py` | CLI entrypoint, orchestrates all 4 stages | **New** — replaces `main.py` |
| `local_db.py` | SQLite schema + queries | **New** — replaces Spanner calls |
| `storage.py` | Local disk read/write | **New** — replaces GCS `storage.py` |
| `local_card_extractor.py` | Extraction pipeline glue | **New** — replaces `card_extractor.py` |
| `scraper.py` | Browser automation against the portal | **Unchanged from Google's repo** |
| `card_info_parser.py` | Regex/protobuf parsing of extracted fields | **Unchanged from Google's repo** |
| `extractor/` | BeautifulSoup HTML table parsing | **Unchanged from Google's repo** |
| `protos/card_pb2.py` | Compiled protobuf schema | **Unchanged from Google's repo** |
| `utils.py` | Logging | **Simplified** — GCP Cloud Logging dependency removed entirely |
