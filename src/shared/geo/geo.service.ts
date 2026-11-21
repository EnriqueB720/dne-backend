import { Injectable } from '@nestjs/common';

import { COUNTRIES, DEFAULT_COUNTRY } from './geo.registry';
import { CountryGeo, PlaceGeo, ProvinceGeo, ProvinceSource } from './geo.types';

/** Coordinates farther than this from every known place don't resolve. */
const MAX_NEAREST_KM = 60;

export interface ProvinceResolution {
  code: string;
  name: string;
  country: string;
  source: ProvinceSource;
}

export interface ResolveProvinceInput {
  /** An ISO 3166-2 code the caller already knows (e.g. picked in the UI). */
  province?: string | null;
  /** Free text: "Heredia", "Escazú", "cerca de Santo Domingo". */
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  country?: string | null;
}

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normalizePlace(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s-]/g, ' ')
    .replace(/[-\s]+/g, ' ')
    .trim();
}

/**
 * Turns whatever the chat knows about "where" into one province.
 *
 * Priority: an explicit province code → a place named in text → the
 * device's coordinates (nearest known place). Text beats the device because
 * "a plumber in Heredia" typed from San José means Heredia.
 */
@Injectable()
export class GeoService {
  private readonly textIndex = new Map<string, Array<{ key: string; province: string; isProvince: boolean }>>();

  constructor() {
    for (const country of Object.values(COUNTRIES)) {
      const entries: Array<{ key: string; province: string; isProvince: boolean }> = [];
      for (const p of country.provinces) {
        entries.push({ key: normalizePlace(p.name), province: p.code, isProvince: true });
        for (const alias of p.aliases) {
          entries.push({ key: normalizePlace(alias), province: p.code, isProvince: true });
        }
      }
      for (const place of country.places) {
        entries.push({ key: normalizePlace(place.name), province: place.province, isProvince: false });
      }
      this.textIndex.set(country.code, entries);
    }
  }

  public country(code?: string | null): CountryGeo {
    return COUNTRIES[(code ?? DEFAULT_COUNTRY).toUpperCase()] ?? COUNTRIES[DEFAULT_COUNTRY];
  }

  public listProvinces(country?: string | null): ProvinceGeo[] {
    return this.country(country).provinces;
  }

  public isProvinceCode(code: string | null | undefined): boolean {
    if (!code) return false;
    return this.findProvince(code) != null;
  }

  public findProvince(code: string): ProvinceGeo | undefined {
    const countryCode = code.split('-')[0]?.toUpperCase();
    return COUNTRIES[countryCode]?.provinces.find((p) => p.code === code.toUpperCase());
  }

  public provinceName(code: string | null | undefined): string | null {
    if (!code) return null;
    return this.findProvince(code)?.name ?? null;
  }

  public resolve(input: ResolveProvinceInput): ProvinceResolution | null {
    const country = this.country(input.country);

    if (input.province && this.isProvinceCode(input.province)) {
      return this.toResolved(input.province.toUpperCase(), 'explicit');
    }

    if (input.location?.trim()) {
      const fromText = this.fromText(input.location, country.code);
      if (fromText) return this.toResolved(fromText, 'text');
    }

    if (input.lat != null && input.lng != null) {
      const fromCoords = this.fromCoordinates(input.lat, input.lng);
      if (fromCoords) return this.toResolved(fromCoords, 'device');
    }

    return null;
  }

  /**
   * Find a province named in free text. A province name anywhere in the
   * text wins (the LAST one, since Spanish disambiguates with "… de
   * Heredia"); otherwise the longest matching place name.
   */
  public fromText(text: string, country: string = DEFAULT_COUNTRY): string | null {
    const haystack = ` ${normalizePlace(text)} `;
    if (!haystack.trim()) return null;
    const entries = this.textIndex.get(country.toUpperCase()) ?? [];

    let lastProvince: { province: string; at: number } | null = null;
    let bestPlace: { province: string; len: number } | null = null;

    for (const e of entries) {
      const at = haystack.lastIndexOf(` ${e.key} `);
      if (at < 0) continue;
      if (e.isProvince) {
        if (!lastProvince || at > lastProvince.at) lastProvince = { province: e.province, at };
      } else if (!bestPlace || e.key.length > bestPlace.len) {
        bestPlace = { province: e.province, len: e.key.length };
      }
    }

    // "San José" is both a province and a canton — same answer either way.
    // A named province beats a place ("San Rafael de Alajuela" → Alajuela).
    if (lastProvince) return lastProvince.province;
    return bestPlace?.province ?? null;
  }

  /** Nearest known place → its province, or null outside every country. */
  public fromCoordinates(lat: number, lng: number): string | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    for (const country of Object.values(COUNTRIES)) {
      const b = country.bounds;
      if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) continue;

      let best: { place: PlaceGeo; km: number } | null = null;
      for (const place of country.places) {
        const km = haversineKm(lat, lng, place.lat, place.lng);
        if (!best || km < best.km) best = { place, km };
      }
      if (best && best.km <= MAX_NEAREST_KM) return best.place.province;
    }
    return null;
  }

  /**
   * Province codes from a list of place names (used to backfill service
   * areas). Unknown names are dropped.
   */
  public provincesFromPlaces(places: Array<string | null | undefined>): string[] {
    const out = new Set<string>();
    for (const p of places) {
      if (!p) continue;
      const code = this.fromText(p);
      if (code) out.add(code);
    }
    return [...out];
  }

  /** Keep only valid codes, uppercase, deduped, home province first. */
  public normalizeServiceProvinces(home: string | null | undefined, extra: string[] = []): string[] {
    const out: string[] = [];
    for (const code of [home, ...extra]) {
      if (!code) continue;
      const upper = code.toUpperCase();
      if (this.isProvinceCode(upper) && !out.includes(upper)) out.push(upper);
    }
    return out;
  }

  private toResolved(code: string, source: ProvinceSource): ProvinceResolution {
    return {
      code,
      name: this.provinceName(code) ?? code,
      country: code.split('-')[0],
      source,
    };
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
