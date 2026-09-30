/**
 * api/sensors.ts
 * Sensor readings API — fronts the backend /api/sensors routes.
 */
import client from './client';

export interface SensorReading {
  id: string;
  crop_id: string;
  sensor_id: string;
  reading_type: string;
  value: number;
  unit: string;
  optimal_range: string | null;
  status: string; // "sensor" | "manual"
  recorded_at: string;
  created_at: string;
}

export interface LatestSensorData {
  success: boolean;
  cropId: string;
  readings: SensorReading[];
  latestTimestamp: string | null;
}

export interface ManualReadingPayload {
  source: 'manual';
  soil_moisture_pct: number;
  soil_temperature_c?: number;
  soil_ph?: number;
  nitrogen_kgac?: number;
  phosphorus_kgac?: number;
  potassium_kgac?: number;
}

export async function getLatestSensorData(cropId: string): Promise<LatestSensorData> {
  const { data } = await client.get<LatestSensorData>(`/sensors/${cropId}/latest`);
  return data;
}

export async function saveSensorReading(
  cropId: string,
  payload: ManualReadingPayload
): Promise<void> {
  await client.post(`/sensors/${cropId}`, payload);
}
