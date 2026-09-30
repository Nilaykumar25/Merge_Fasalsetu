/**
 * weatherLocation.ts
 * Shared singleton — gets browser GPS, fetches weather from weather_agent.py,
 * caches result in sessionStorage so it's only fetched once per session.
 */

const API = (import.meta as any).env?.VITE_SOIL_NPK_API_URL ?? 'http://localhost:8000';
const CACHE_KEY = 'fasalsetu_weather_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export interface LiveWeather {
  location: string;       // "Hisar, Haryana" or "28.61,77.21"
  temperature_c: number;
  condition: string;
  humidity_pct: number;
  wind_speed_kmh: number;
  rain_expected: boolean;
  source: string;
  coords?: { lat: number; lon: number };
}

let _promise: Promise<LiveWeather> | null = null;

function readCache(): LiveWeather | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch { /* ignore */ }
  return null;
}

function writeCache(data: LiveWeather) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); }
  catch { /* ignore */ }
}

async function getGPSCoords(): Promise<string> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(''); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve(`${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)}`),
      () => resolve(''),
      { timeout: 5000 }
    );
  });
}

async function fetchWeather(location: string): Promise<LiveWeather> {
  const res = await fetch(`${API}/weather/current`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location }),
  });
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  return res.json();
}

/** Returns live weather, using cache if fresh. Safe to call from multiple components. */
export function getLiveWeather(): Promise<LiveWeather> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);

  if (_promise) return _promise;

  _promise = (async () => {
    try {
      const coords = await getGPSCoords();
      const location = coords || 'India'; // fallback — weather_agent uses India centre
      const data = await fetchWeather(location);
      writeCache(data);
      return data;
    } catch {
      // Offline fallback
      const fallback: LiveWeather = {
        location: 'India', temperature_c: 28, condition: 'Clear',
        humidity_pct: 60, wind_speed_kmh: 12, rain_expected: false, source: 'fallback',
      };
      return fallback;
    } finally {
      _promise = null;
    }
  })();

  return _promise;
}

/** React hook — returns weather state */
import { useState, useEffect } from 'react';

export function useWeather() {
  const [weather, setWeather] = useState<LiveWeather | null>(readCache());
  const [loading, setLoading] = useState(!readCache());

  useEffect(() => {
    if (weather) return;
    getLiveWeather().then(w => { setWeather(w); setLoading(false); });
  }, []);

  return { weather, loading };
}
