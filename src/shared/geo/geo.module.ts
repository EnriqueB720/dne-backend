import { Global, Module } from '@nestjs/common';

import { GeoResolver } from './geo.resolver';
import { GeoService } from './geo.service';

/** Province registry + resolution. Global: search, suppliers and admin use it. */
@Global()
@Module({
  providers: [GeoService, GeoResolver],
  exports: [GeoService],
})
export class GeoModule {}
