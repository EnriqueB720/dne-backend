import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/**
 * Standalone module for the /health endpoint. PrismaService is imported
 * via the globally-registered PrismaModule (see PrismaModule), so
 * nothing extra needs to be wired here.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
