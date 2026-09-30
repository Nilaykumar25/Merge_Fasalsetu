"""
xml_ingest.py — Load Soil Health Card XML files directly into Cards_info.

The government portal's old export flow (and tools like the Selenium scraper
at github.com/deepanshu-yadav/soil_data_analysis) produce one XML file per
soil sample.  Each file has a {SoilHealthCard}Details1 element that holds
sample metadata as attributes and nutrient readings as child elements with a
TestValue1 attribute.

This is a faster alternative to the full INGEST→CARDS→SCRAPE→EXTRACT pipeline
when XML files are already available on disk (e.g. copied from a colleague,
downloaded via another tool, or obtained from a data-sharing request to the
state agriculture department).

Usage
─────
  # Ingest all XML files under a directory tree:
  python xml_ingest.py --xml-dir /path/to/xml/files

  # Dry-run: parse and print, don't write to DB:
  python xml_ingest.py --xml-dir /path/to/xml/files --dry-run

  # Explicit glob pattern:
  python xml_ingest.py --xml-dir /path/to/xml/files --pattern "**/*.xml"

  # Then export as usual:
  python local_main.py EXPORT --out my_data.csv --near-radius-km 25

Schema mapping
──────────────
XML attribute / child order → Cards_info column

  Sample_No                → SampleNo
  Sample_Collection_Date   → sample_collection_date
  Land_Area                → farm_size (numeric part), farm_size_unit
  Irrigation_Rainfed1      → irrigation_method
  Textbox6 (lat,lon)       → latitude, longitude

  Child elements in order  → pH, EC, OC, N, P, K, S, Zn, B, Fe, Mn, Cu
  (TestValue1 attribute)

Notes
─────
- Files from deepanshu-yadav/soil_data_analysis are for Amritsar (Punjab).
  They cannot be used directly for Delhi/Haryana analysis, but the same XML
  format will be produced by the SHC portal for any state.
- Duplicate (SampleNo, SrNo, VillageId) rows are silently replaced
  (INSERT OR REPLACE), so re-ingesting the same directory is safe.
- VillageId is set to "xml_import" for XML-sourced rows so they can be
  distinguished from browser-scraped rows in queries.
- SrNo is extracted from the sample number suffix (e.g. ".../1" → 1),
  defaulting to 1 if the suffix is missing or non-numeric.
"""

import argparse
import os
import re
import sys
from glob import iglob
from pathlib import Path

import xml.etree.ElementTree as ET

# Allow running from the shc-local-scraper directory without installing.
sys.path.insert(0, str(Path(__file__).parent))
import local_db

# ── Nutrient order in the XML child elements ──────────────────────────────────
# The SHC XML always emits TestValue1 children in this fixed order.
NUTRIENT_ORDER = ['pH', 'EC', 'OC', 'N', 'P', 'K', 'S', 'Zn', 'B', 'Fe', 'Mn', 'Cu']


def _parse_latlon(textbox6: str):
    """Extract (lat, lon) floats from the 'Textbox6' attribute string.

    Handles two formats seen in SHC XML:
      "31.908097,74.837975"                                   (bare pair)
      "Geo Position (GPS):Latitude 31.525290°N Longitude 74.486600°E"
    Returns (None, None) on parse failure.
    """
    if not textbox6:
        return None, None
    nums = re.findall(r'\d+\.\d+', textbox6)
    if len(nums) >= 2:
        try:
            return float(nums[0]), float(nums[1])
        except ValueError:
            pass
    return None, None


def _parse_farm_size(land_area: str):
    """Split '3.00  Acre' into (3.0, 'Acre'). Returns (None, None) on failure."""
    if not land_area:
        return None, None
    m = re.match(r'([\d.]+)\s*(.*)', land_area.strip())
    if m:
        try:
            return float(m.group(1)), m.group(2).strip() or None
        except ValueError:
            pass
    return None, None


def _parse_sr_no(sample_no: str) -> int:
    """Extract Sr_No from the sample number suffix (last '/'-delimited token)."""
    if sample_no and '/' in sample_no:
        suffix = sample_no.rsplit('/', 1)[-1]
        try:
            return int(suffix)
        except ValueError:
            pass
    return 1


def _safe_float(val: str):
    """Convert a string to float; return None for '--', empty, or non-numeric."""
    if val is None:
        return None
    val = val.strip()
    if val in ('', '--', 'N/A', 'NA'):
        return None
    try:
        return float(val)
    except ValueError:
        return None


def parse_xml_file(file_path: str) -> dict | None:
    """Parse a single SHC XML file and return a flat dict of Cards_info columns.

    Returns None if the file cannot be parsed or lacks the expected structure.

    All elements use the {SoilHealthCard} namespace.  There are two kinds of
    {SoilHealthCard}Details1 elements:
      - Metadata element: has Sample_No attribute, no TestName2
      - Nutrient elements: have TestName2 + TestValue1 attributes, one per nutrient
    """
    try:
        tree = ET.parse(file_path)
    except ET.ParseError as e:
        print(f"  SKIP {file_path}: XML parse error — {e}", file=sys.stderr)
        return None

    root = tree.getroot()
    NS = '{SoilHealthCard}'
    tag = f'{NS}Details1'

    shc = None          # metadata element
    nutrient_els = []   # nutrient elements

    for el in root.iter(tag):
        if el.get('Sample_No'):
            shc = el
        elif el.get('TestName2'):
            nutrient_els.append(el)

    if shc is None:
        print(f"  SKIP {file_path}: no Details1 element with Sample_No", file=sys.stderr)
        return None

    sample_no = shc.get('Sample_No', '').strip()
    if not sample_no:
        print(f"  SKIP {file_path}: empty Sample_No", file=sys.stderr)
        return None

    sr_no     = _parse_sr_no(sample_no)
    coll_date = shc.get('Sample_Collection_Date', '').strip() or None
    farm_size, farm_size_unit = _parse_farm_size(shc.get('Land_Area', ''))
    irrigation = shc.get('Irrigation_Rainfed1', '').strip() or None

    # Geo position lives in the {SoilHealthCard}Textbox6 child element's
    # Textbox6 attribute, OR directly as 'Textbox6' on the Details1 element
    # depending on portal version. Check both.
    geo_str = shc.get('Textbox6', '')
    if not geo_str:
        tb6 = root.find(f'.//{NS}Textbox6')
        if tb6 is not None:
            geo_str = tb6.get('Textbox6', '') or tb6.text or ''
    lat, lon = _parse_latlon(geo_str)

    # ── nutrient readings ─────────────────────────────────────────────────────
    NAME_MAP = {
        'pH':                       'pH',
        'EC':                       'EC',
        'Organic Carbon (OC)':      'OC',
        'Available Nitrogen (N)':   'N',
        'Available Phosphorus (P)': 'P',
        'Available Potassium (K)':  'K',
        'Available Sulphur (S)':    'S',
        'Available Zinc (Zn)':      'Zn',
        'Available Boron (B)':      'B',
        'Available Iron (Fe)':      'Fe',
        'Available Manganese (Mn)': 'Mn',
        'Available Copper (Cu)':    'Cu',
    }

    nutrients = {}
    for el in nutrient_els:
        long_name = el.get('TestName2', '').strip()
        short = NAME_MAP.get(long_name)
        if short:
            nutrients[short] = (
                _safe_float(el.get('TestValue1', '')),
                el.get('Unit', '').strip() or None,
                el.get('Rating', '').strip() or None,
            )

    # ── build Cards_info-compatible dict ─────────────────────────────────────
    row = {
        'SampleNo':               sample_no,
        'SrNo':                   sr_no,
        'VillageId':              'xml_import',
        'sample_collection_date': coll_date,
        'farm_size':              farm_size,
        'farm_size_unit':         farm_size_unit,
        'irrigation_method':      irrigation,
        'latitude':               lat,
        'longitude':              lon,
    }

    for short in NAME_MAP.values():
        if short in nutrients:
            val, unit, rating = nutrients[short]
            row[f'{short}_value']  = val
            row[f'{short}_unit']   = unit
            row[f'{short}_rating'] = rating

    return row


def ingest_xml_dir(xml_dir: str, pattern: str = '**/*.xml',
                   dry_run: bool = False) -> tuple[int, int, int]:
    """Walk xml_dir, parse every XML, and insert into Cards_info.

    Returns (total_found, inserted, skipped).
    """
    base = Path(xml_dir)
    if not base.exists():
        print(f"ERROR: directory not found: {xml_dir}", file=sys.stderr)
        sys.exit(1)

    total = inserted = skipped = 0

    for file_path in iglob(str(base / pattern), recursive=True):
        total += 1
        row = parse_xml_file(file_path)
        if row is None:
            skipped += 1
            continue

        if dry_run:
            print(f"  [dry-run] {row['SampleNo']}  lat={row['latitude']}  lon={row['longitude']}  "
                  f"N={row.get('N_value')}  P={row.get('P_value')}  K={row.get('K_value')}")
            inserted += 1
            continue

        try:
            cols = list(row.keys())
            vals = [row[c] for c in cols]
            local_db.insert_card_info(cols, vals)
            inserted += 1
        except Exception as e:
            print(f"  DB error for {row['SampleNo']}: {e}", file=sys.stderr)
            skipped += 1

    return total, inserted, skipped


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Ingest Soil Health Card XML files directly into Cards_info.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('--xml-dir', required=True,
                        help='Root directory containing SHC XML files')
    parser.add_argument('--pattern', default='**/*.xml',
                        help='Glob pattern relative to --xml-dir (default: **/*.xml)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Parse and print rows without writing to DB')
    args = parser.parse_args()

    print(f"{'DRY RUN — ' if args.dry_run else ''}Scanning {args.xml_dir} "
          f"for XML files (pattern: {args.pattern})...")

    total, inserted, skipped = ingest_xml_dir(
        args.xml_dir, pattern=args.pattern, dry_run=args.dry_run
    )

    print(f"\nDone.")
    print(f"  Files found:  {total}")
    print(f"  {'Parsed' if args.dry_run else 'Inserted'}: {inserted}")
    print(f"  Skipped:      {skipped}")

    if not args.dry_run and inserted > 0:
        print(f"\nRows are in Cards_info with VillageId='xml_import'.")
        print(f"Run: python local_main.py EXPORT --out my_data.csv")
