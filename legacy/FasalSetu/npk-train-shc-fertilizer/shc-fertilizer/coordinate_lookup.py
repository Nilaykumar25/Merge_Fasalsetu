"""
COORDINATE LOOKUP
Given a farmer's (lat, lon), find the nearest scraped Soil Health Card
sample and return its N/P/K ratings + soil type.

Input: a CSV exported by shc-local-scraper's `python local_main.py EXPORT`
command (has latitude, longitude, N_rating, P_rating, K_rating, soil_type,
sample_collection_date columns among others).

Small dataset (a hackathon-scale pilot scrape, at most a few thousand rows)
so a simple vectorized haversine scan is plenty fast -- no need for a real
spatial index (BallTree/KDTree) at this scale. If you scale to a full state
later, swap `nearest_sample()`'s linear scan for sklearn's BallTree with
the haversine metric.
"""

import pandas as pd
import numpy as np
import os

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1, lon1, lat2, lon2):
    """Vectorized haversine distance in km. lat2/lon2 may be arrays."""
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(a))


class ShcCoordinateIndex:
    def __init__(self, csv_path):
        if not os.path.exists(csv_path):
            raise FileNotFoundError(
                f"SHC export CSV not found at {csv_path}. Run the scraper's "
                f"EXPORT step first: python local_main.py EXPORT --out {csv_path}"
            )
        df = pd.read_csv(csv_path)

        required = {'latitude', 'longitude'}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"SHC export CSV is missing required columns: {missing}")

        before = len(df)
        df = df.dropna(subset=['latitude', 'longitude'])
        df = df[(df['latitude'] != 0) & (df['longitude'] != 0)]
        after = len(df)
        if after < before:
            print(f"[coordinate_lookup] Dropped {before - after} rows with missing/invalid "
                  f"coordinates ({after} usable samples remain)")

        self.df = df.reset_index(drop=True)

    def nearest_sample(self, lat, lon, max_distance_km=10.0):
        """
        Returns (row_dict, distance_km) for the nearest sample, or
        (None, None) if nothing is within max_distance_km.
        """
        if len(self.df) == 0:
            return None, None

        distances = haversine_km(lat, lon, self.df['latitude'].values, self.df['longitude'].values)
        best_idx = int(np.argmin(distances))
        best_distance = float(distances[best_idx])

        if best_distance > max_distance_km:
            return None, best_distance

        return self.df.iloc[best_idx].to_dict(), best_distance

    def nearest_n_samples(self, lat, lon, n=5, max_distance_km=25.0):
        """Return the n nearest samples within range, sorted by distance --
        useful if you want to average across a few nearby readings instead
        of trusting a single sample."""
        if len(self.df) == 0:
            return []

        distances = haversine_km(lat, lon, self.df['latitude'].values, self.df['longitude'].values)
        df_with_dist = self.df.copy()
        df_with_dist['_distance_km'] = distances
        df_with_dist = df_with_dist[df_with_dist['_distance_km'] <= max_distance_km]
        df_with_dist = df_with_dist.sort_values('_distance_km').head(n)

        return df_with_dist.to_dict('records')


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 4:
        print("Usage: python coordinate_lookup.py <shc_export.csv> <lat> <lon>")
        sys.exit(1)

    csv_path, lat, lon = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    index = ShcCoordinateIndex(csv_path)
    row, dist = index.nearest_sample(lat, lon)

    if row is None:
        print(f"No SHC sample found within range of ({lat}, {lon})")
    else:
        print(f"Nearest sample is {dist:.2f} km away:")
        for k in ['N_rating', 'P_rating', 'K_rating', 'soil_type', 'sample_collection_date']:
            print(f"  {k}: {row.get(k)}")
