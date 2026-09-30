"""
LOCAL VERSION of the Spanner database layer.
Schema is a direct SQLite translation of infrastructure/spanner.tf,
so Cards_info ends up with the same N_value / P_value / K_value /
pH_value / EC_value / OC_value / micronutrient columns as the original,
in real lab units -- exactly what's useful for the NPK research project.
"""

import os
import sqlite3
import json
import logging
import threading

DB_PATH = os.environ.get('SHC_DB_PATH', './data/shc_metadata.db')
os.makedirs(os.path.dirname(DB_PATH) or '.', exist_ok=True)

_lock = threading.Lock()


def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


CARDS_INFO_NUTRIENT_COLUMNS = []
for _param in ['pH', 'EC', 'OC', 'N', 'P', 'K', 'S', 'Zn', 'B', 'Fe', 'Mn', 'Cu']:
    CARDS_INFO_NUTRIENT_COLUMNS += [
        f'{_param}_parameter TEXT',
        f'{_param}_value REAL',
        f'{_param}_unit TEXT',
        f'{_param}_rating TEXT',
        f'{_param}_min_normal_level REAL',
        f'{_param}_max_normal_level REAL',
        f'{_param}_unit_normal_level TEXT',
    ]

SCHEMA = f"""
CREATE TABLE IF NOT EXISTS States (
    StateId INTEGER PRIMARY KEY,
    Name TEXT
);

CREATE TABLE IF NOT EXISTS Districts (
    StateId  INTEGER NOT NULL,
    DistrictId TEXT NOT NULL,   -- MongoDB ObjectId (24-char hex string)
    Name TEXT,
    Code TEXT,
    PRIMARY KEY (StateId, DistrictId)
);

CREATE TABLE IF NOT EXISTS SubDistricts (
    DistrictId    TEXT NOT NULL,   -- MongoDB ObjectId
    SubDistrictId TEXT NOT NULL,   -- MongoDB ObjectId
    Name TEXT,
    Code TEXT,
    PRIMARY KEY (DistrictId, SubDistrictId)
);

CREATE TABLE IF NOT EXISTS Villages (
    SubDistrictId TEXT NOT NULL,   -- MongoDB ObjectId
    VillageId     TEXT NOT NULL,   -- MongoDB ObjectId
    Name TEXT,
    Code TEXT,
    CardsLoaded INTEGER DEFAULT 0,
    PRIMARY KEY (SubDistrictId, VillageId)
);

CREATE TABLE IF NOT EXISTS Cards (
    VillageId     TEXT NOT NULL,   -- MongoDB ObjectId
    Sample TEXT NOT NULL,
    VillageGrid TEXT,
    SrNo INTEGER NOT NULL,
    Ingested INTEGER DEFAULT 0,
    Extracted INTEGER DEFAULT 0,
    StateId INTEGER,
    DistrictId    TEXT,            -- MongoDB ObjectId
    SubDistrictId TEXT,            -- MongoDB ObjectId
    extract_attempt INTEGER DEFAULT 0,
    data_comparison_mismatch TEXT,
    PRIMARY KEY (VillageId, Sample, SrNo)
);
CREATE INDEX IF NOT EXISTS CARDS_FULL_INDEX ON Cards(VillageId, Ingested);

CREATE TABLE IF NOT EXISTS Cards_info (
    SampleNo TEXT NOT NULL,
    SrNo INTEGER NOT NULL,
    VillageId     TEXT NOT NULL,   -- MongoDB ObjectId
    SubDistrictId TEXT,
    DistrictId    TEXT,
    StateId INTEGER,
    soil_health_card_number TEXT,
    validity TEXT,
    survey_no TEXT,
    farm_size REAL,
    farm_size_unit TEXT,
    irrigation_method TEXT,
    latitude REAL,
    longitude REAL,
    soil_test_lab TEXT,
    soil_type TEXT,
    {', '.join(CARDS_INFO_NUTRIENT_COLUMNS)},
    error_log TEXT,
    sample_collection_date TEXT,
    recommendations TEXT,
    fertilizer_combinations TEXT,
    PRIMARY KEY (SampleNo, SrNo, VillageId)
);

CREATE TABLE IF NOT EXISTS Checkpoints (
    Id INTEGER PRIMARY KEY,
    StateId INTEGER,
    DistrictId    TEXT,            -- MongoDB ObjectId
    SubDistrictId TEXT             -- MongoDB ObjectId
);
"""


def init_db():
    with _lock:
        conn = get_conn()
        # ── Schema migration guard ────────────────────────────────────────────
        # The original schema used INTEGER PKs for Districts/SubDistricts/Villages.
        # The new GraphQL API returns MongoDB ObjectIds (24-char hex TEXT).
        # Detect the old schema by checking the column type of DistrictId in
        # Districts; if it's INTEGER, drop and recreate all affected tables.
        needs_migrate = False
        try:
            info = conn.execute("PRAGMA table_info(Districts)").fetchall()
            for col in info:
                # col layout: (cid, name, type, notnull, dflt_value, pk)
                if col[1] == 'DistrictId' and 'INT' in col[2].upper():
                    needs_migrate = True
                    break
        except Exception:
            pass  # table doesn't exist yet — fresh DB, no migration needed

        if needs_migrate:
            logging.warning(
                'local_db: detected old INTEGER-keyed schema — dropping and '
                'recreating Districts, SubDistricts, Villages, Cards, Cards_info, '
                'Checkpoints tables to support MongoDB ObjectId TEXT keys. '
                'Run INGEST again to repopulate geography.'
            )
            for tbl in ('Cards_info', 'Cards', 'Villages',
                        'SubDistricts', 'Districts', 'Checkpoints'):
                conn.execute(f'DROP TABLE IF EXISTS {tbl}')
            conn.commit()

        conn.executescript(SCHEMA)
        conn.commit()
        conn.close()


init_db()


# --------------------------------------------------------------------------
# Metadata ingestion (states / districts / subdistricts / villages)
# --------------------------------------------------------------------------

def insertStates(states):
    with _lock:
        conn = get_conn()
        conn.executemany(
            "INSERT OR REPLACE INTO States (StateId, Name) VALUES (?, ?)",
            [(int(s["id"]), s["name"]) for s in states]
        )
        conn.commit()
        conn.close()


def insertDistricts(stateId, districts):
    with _lock:
        conn = get_conn()
        conn.executemany(
            "INSERT OR REPLACE INTO Districts (DistrictId, StateId, Name, Code) VALUES (?, ?, ?, ?)",
            [(str(d["id"]), int(stateId), d["name"], d.get("code", "")) for d in districts]
        )
        conn.commit()
        conn.close()


def insertSubDistricts(districtId, subDistricts):
    with _lock:
        conn = get_conn()
        conn.executemany(
            "INSERT OR REPLACE INTO SubDistricts (SubDistrictId, DistrictId, Name, Code) VALUES (?, ?, ?, ?)",
            [(str(sd["id"]), str(districtId), sd["name"], sd.get("code", "")) for sd in subDistricts]
        )
        conn.commit()
        conn.close()


def insertVillages(subDistrictId, villages):
    with _lock:
        conn = get_conn()
        conn.executemany(
            "INSERT OR REPLACE INTO Villages (VillageId, SubDistrictId, Name, Code, CardsLoaded) "
            "VALUES (?, ?, ?, ?, COALESCE((SELECT CardsLoaded FROM Villages WHERE VillageId=?), 0))",
            [(str(v["id"]), str(subDistrictId), v["name"], v.get("code", ""), str(v["id"])) for v in villages]
        )
        conn.commit()
        conn.close()


def insertCards(villageId, cards):
    if not cards:
        return
    with _lock:
        conn = get_conn()
        conn.executemany(
            "INSERT OR REPLACE INTO Cards (VillageId, Sample, VillageGrid, SrNo) "
            "VALUES (?, ?, ?, ?)",
            [(str(villageId), c["sample"], c["village_grid"], c["sr_no"]) for c in cards]
        )
        conn.commit()
        conn.close()


def getCheckpoint(Id):
    conn = get_conn()
    row = conn.execute(
        "SELECT StateId, DistrictId, SubDistrictId FROM Checkpoints WHERE Id = ?",
        (Id,)
    ).fetchone()
    conn.close()
    if row:
        return row[0], row[1], row[2]
    return -1, -1, -1


def updateCheckpoint(Id, StateId, DistrictId, SubDistrictId):
    with _lock:
        conn = get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO Checkpoints (Id, StateId, DistrictId, SubDistrictId) "
            "VALUES (?, ?, ?, ?)",
            (Id, StateId, DistrictId, SubDistrictId)
        )
        conn.commit()
        conn.close()


def markCard(VillageId, Sample, SrNo, Ingested):
    with _lock:
        conn = get_conn()
        conn.execute(
            "UPDATE Cards SET Ingested = ? WHERE VillageId = ? AND Sample = ? AND SrNo = ?",
            (1 if Ingested else 0, str(VillageId), Sample, SrNo)
        )
        conn.commit()
        conn.close()


def markVillage(VillageId, CardsLoaded):
    with _lock:
        conn = get_conn()
        conn.execute(
            "UPDATE Villages SET CardsLoaded = ? WHERE VillageId = ?",
            (1 if CardsLoaded else 0, str(VillageId))
        )
        conn.commit()
        conn.close()


def markCardExtracted(VillageId, Sample, SrNo, Extracted):
    with _lock:
        conn = get_conn()
        conn.execute(
            "UPDATE Cards SET Extracted = ? WHERE VillageId = ? AND Sample = ? AND SrNo = ?",
            (1 if Extracted else 0, str(VillageId), Sample, SrNo)
        )
        conn.commit()
        conn.close()


def incExtractAttempt(VillageId, Sample, SrNo):
    with _lock:
        conn = get_conn()
        conn.execute(
            "UPDATE Cards SET extract_attempt = extract_attempt + 1 "
            "WHERE VillageId = ? AND Sample = ? AND SrNo = ?",
            (str(VillageId), Sample, SrNo)
        )
        conn.commit()
        conn.close()


def get_village_view(VillageId):
    conn = get_conn()
    row = conn.execute(
        """SELECT v.Name, sd.SubDistrictId, sd.Name, d.DistrictId, d.Name, s.StateId, s.Name
           FROM Villages v
           JOIN SubDistricts sd ON v.SubDistrictId = sd.SubDistrictId
           JOIN Districts d ON sd.DistrictId = d.DistrictId
           JOIN States s ON d.StateId = s.StateId
           WHERE v.VillageId = ?""",
        (VillageId,)
    ).fetchone()
    conn.close()
    if not row:
        return {}
    return {
        "village": row[0],
        "mandal_id": str(row[1]),
        "mandal": row[2],
        "district_id": str(row[3]),
        "district": row[4],
        "state_id": str(row[5]),
        "state": row[6],
    }


def count_villages_pending_cards():
    conn = get_conn()
    n = conn.execute("SELECT COUNT(*) FROM Villages WHERE CardsLoaded IS NOT 1").fetchone()[0]
    conn.close()
    return n


def get_villages_pending_cards(limit, offset):
    conn = get_conn()
    rows = conn.execute(
        """SELECT v.VillageId, v.SubDistrictId, d.DistrictId, s.StateId
           FROM Villages v
           JOIN SubDistricts sd ON v.SubDistrictId = sd.SubDistrictId
           JOIN Districts d ON sd.DistrictId = d.DistrictId
           JOIN States s ON d.StateId = s.StateId
           WHERE v.CardsLoaded IS NOT 1
           ORDER BY v.VillageId
           LIMIT ? OFFSET ?""",
        (limit, offset)
    ).fetchall()
    conn.close()
    return rows


def count_uningested_cards():
    conn = get_conn()
    n = conn.execute("SELECT COUNT(*) FROM Cards WHERE Ingested IS NOT 1").fetchone()[0]
    conn.close()
    return n


def get_uningested_cards(limit, offset):
    conn = get_conn()
    rows = conn.execute(
        """SELECT VillageId, Sample, VillageGrid, SrNo
           FROM Cards WHERE Ingested IS NOT 1
           ORDER BY VillageId
           LIMIT ? OFFSET ?""",
        (limit, offset)
    ).fetchall()
    conn.close()
    return rows


def get_cards_ready_to_extract(limit, offset, max_attempts=5):
    conn = get_conn()
    rows = conn.execute(
        """SELECT VillageId, Sample, VillageGrid, SrNo, extract_attempt
           FROM Cards
           WHERE Ingested IS 1 AND Extracted IS NOT 1 AND extract_attempt < ?
           ORDER BY VillageId
           LIMIT ? OFFSET ?""",
        (max_attempts, limit, offset)
    ).fetchall()
    conn.close()
    return rows


def insert_card_info(cols, vals):
    """Used by local_card_extractor.py in place of the Spanner insert_or_update."""
    placeholders = ','.join(['?'] * len(cols))
    col_list = ','.join(cols)
    # protobuf empty/default values -> None where appropriate is handled by caller
    clean_vals = []
    for v in vals:
        if isinstance(v, (dict, list)):
            clean_vals.append(json.dumps(v))
        else:
            clean_vals.append(v)
    with _lock:
        conn = get_conn()
        conn.execute(
            f"INSERT OR REPLACE INTO Cards_info ({col_list}) VALUES ({placeholders})",
            clean_vals
        )
        conn.commit()
        conn.close()


def get_card_extract_status(VillageId, Sample, SrNo):
    conn = get_conn()
    row = conn.execute(
        "SELECT Extracted, extract_attempt FROM Cards WHERE VillageId=? AND Sample=? AND SrNo=?",
        (str(VillageId), Sample, SrNo)
    ).fetchone()
    conn.close()
    return row
