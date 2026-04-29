/**
 * Map de cada sede del Mundial 2026 a su IANA timezone.
 *
 * Las claves son los nombres de venue tal como vienen del JSON oficial de la
 * FIFA (que cargamos en supabase/seed-mundial-2026.sql). Si en algún momento
 * cambias un venue por otro nombre, añádelo aquí o el partido caerá al
 * fallback (sin venue tz, solo se mostrará la hora local del navegador).
 */
export const VENUE_TIMEZONES: Record<string, string> = {
  // México (sin DST; UTC-6 todo el año)
  "Mexico City": "America/Mexico_City",
  "Guadalajara (Zapopan)": "America/Mexico_City",
  "Monterrey (Guadalupe)": "America/Monterrey",

  // Eastern (UTC-4 con DST en junio-julio)
  Atlanta: "America/New_York",
  "Boston (Foxborough)": "America/New_York",
  "New York/New Jersey (East Rutherford)": "America/New_York",
  Philadelphia: "America/New_York",
  "Miami (Miami Gardens)": "America/New_York",
  Toronto: "America/Toronto",

  // Central (UTC-5 con DST)
  Houston: "America/Chicago",
  "Dallas (Arlington)": "America/Chicago",
  "Kansas City": "America/Chicago",

  // Pacific (UTC-7 con DST)
  "Los Angeles (Inglewood)": "America/Los_Angeles",
  "San Francisco Bay Area (Santa Clara)": "America/Los_Angeles",
  Seattle: "America/Los_Angeles",
  Vancouver: "America/Vancouver",
};

export function venueTimezone(venue: string | null | undefined): string | null {
  if (!venue) return null;
  return VENUE_TIMEZONES[venue] ?? null;
}

/** Versión "humana" del nombre de venue: cortamos el paréntesis aclarativo. */
export function venueShortName(venue: string | null | undefined): string {
  if (!venue) return "";
  return venue.replace(/\s*\([^)]+\)\s*/g, "").trim();
}
