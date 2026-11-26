import { Args, Float, Query, Resolver } from '@nestjs/graphql';

import { GeoService } from './geo.service';
import { Province, ResolvedProvince } from './geo.model';

@Resolver()
export class GeoResolver {
  constructor(private readonly geoService: GeoService) {}

  /** Provinces of a country, for pickers. */
  @Query(() => [Province])
  provinces(
    @Args('country', { nullable: true, defaultValue: 'CR' }) country: string,
  ): Province[] {
    const c = this.geoService.country(country);
    return c.provinces.map((p) => ({ code: p.code, name: p.name, country: c.code }));
  }

  /**
   * Which province the chat should search in. Used by the composer's
   * location chip ("📍 Heredia"). Returns null when nothing resolves.
   */
  @Query(() => ResolvedProvince, { nullable: true })
  resolveProvince(
    @Args('location', { nullable: true }) location?: string,
    @Args('lat', { type: () => Float, nullable: true }) lat?: number,
    @Args('lng', { type: () => Float, nullable: true }) lng?: number,
  ): ResolvedProvince | null {
    return this.geoService.resolve({ location, lat, lng });
  }
}
