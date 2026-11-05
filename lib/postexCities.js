import { POSTEX_OPERATIONAL_CITIES } from "../data/postexCities.js";

export { POSTEX_OPERATIONAL_CITIES };

/**
 * Case-insensitive lookup map for instant O(1) canonical matching.
 * Maps lowercase city name -> canonical PostEx operational city name.
 */
const POSTEX_CITY_MAP = new Map(
  POSTEX_OPERATIONAL_CITIES.map((name) => [name.trim().toLowerCase(), name.trim()])
);

/**
 * Major commercial & population centers in Pakistan with exact canonical PostEx names.
 * These are shown at the top of the combobox for 1-tap customer selection.
 */
export const POPULAR_POSTEX_CITIES = Object.freeze([
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "MULTAN",
  "PESHAWAR",
  "QUETTA",
  "GUJRANWALA",
  "SIALKOT",
  "HYDERABAD",
  "BAHAWALPUR",
  "SARGODHA",
  "SUKKUR",
  "ABBOTTABAD",
]);

/**
 * Checks if a city name is a valid operational delivery city served by PostEx (case-insensitive).
 * @param {string} city
 * @returns {boolean}
 */
export function isPostexCity(city) {
  if (!city || typeof city !== "string") return false;
  return POSTEX_CITY_MAP.has(city.trim().toLowerCase());
}

/**
 * Resolves any valid city input (case-insensitive) to its canonical PostEx name.
 * e.g. "multan" or "Multan" -> "MULTAN", "lahore" -> "Lahore".
 * Returns null if the city is not in PostEx's serviceable list.
 * @param {string} city
 * @returns {string|null}
 */
export function getCanonicalPostexCity(city) {
  if (!city || typeof city !== "string") return null;
  return POSTEX_CITY_MAP.get(city.trim().toLowerCase()) || null;
}

/**
 * Filters and ranks PostEx cities based on user search query.
 * Ranking priority:
 * 1. Exact match
 * 2. Starts with query
 * 3. Word boundary starts with query (e.g. "Abad" in "Faisal Abad" or "(AJK)" in "Mirpur (AJK)")
 * 4. Contains query anywhere
 *
 * @param {string} query
 * @param {number} [limit=40]
 * @param {string[]} [cityList=POSTEX_OPERATIONAL_CITIES]
 * @returns {string[]}
 */
export function searchPostexCities(query = "", limit = 40, cityList = POSTEX_OPERATIONAL_CITIES) {
  const clean = String(query || "").trim().toLowerCase();
  if (!clean) return cityList.slice(0, limit);

  const exact = [];
  const startsWith = [];
  const wordStartsWith = [];
  const contains = [];

  for (const city of cityList) {
    const lower = city.toLowerCase();
    if (lower === clean) {
      exact.push(city);
    } else if (lower.startsWith(clean)) {
      startsWith.push(city);
    } else if (
      lower.includes(" " + clean) ||
      lower.includes("-" + clean) ||
      lower.includes("(" + clean) ||
      lower.includes("/" + clean)
    ) {
      wordStartsWith.push(city);
    } else if (lower.includes(clean)) {
      contains.push(city);
    }
  }

  return [...exact, ...startsWith, ...wordStartsWith, ...contains].slice(0, limit);
}
