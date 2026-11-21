/** A first-level subdivision (province / state), keyed by ISO 3166-2 code. */
export interface ProvinceGeo {
  /** ISO 3166-2 code, e.g. "CR-H". Stored in `supplier.province`. */
  code: string;
  /** Official name in the local language, e.g. "Heredia". */
  name: string;
  /** Extra spellings people type (already lowercase, no accents). */
  aliases: string[];
}

/** A canton, town, district or beach and the province it belongs to. */
export interface PlaceGeo {
  name: string;
  province: string;
  lat: number;
  lng: number;
}

export interface CountryGeo {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: { es: string; en: string };
  /** Rough bounding box — coordinates outside it never resolve to this country. */
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  provinces: ProvinceGeo[];
  places: PlaceGeo[];
}

/** How a province was worked out — surfaced to the UI and the AI. */
export type ProvinceSource = 'explicit' | 'text' | 'device';
