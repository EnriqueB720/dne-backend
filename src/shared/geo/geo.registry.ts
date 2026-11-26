import { CR } from './countries/cr';
import { CountryGeo } from './geo.types';

/**
 * Every country Solvo operates in. Adding one = add a file under
 * ./countries and list it here; nothing else (DB stores ISO codes).
 */
export const COUNTRIES: Record<string, CountryGeo> = {
  CR,
};

export const DEFAULT_COUNTRY = 'CR';
