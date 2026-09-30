/**
 * api/weather.js
 * Weather data API (if backend exposes a route, otherwise use supabase)
 * For now, weather is integrated via backend services, not a direct endpoint
 */
import client from './client.js';

/**
 * Get weather forecast for a location
 * Note: Backend integrates weather via OpenWeatherMap in irrigation/recommendations
 * This is a placeholder for future direct weather endpoint
 * @param {{ lat: number, lon: number }} coords
 */
export async function getWeatherForecast(coords) {
  // TODO: Backend doesn't expose weather endpoint directly yet
  // Weather data comes through irrigation schedule and recommendations
  throw new Error('Direct weather endpoint not implemented - use irrigation schedule');
}
