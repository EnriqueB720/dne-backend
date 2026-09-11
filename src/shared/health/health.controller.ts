import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { PrismaService } from '@prisma-datasource';

/**
 * Container liveness / readiness probe. Railway (and any orchestrator)
 * pings this to decide whether a freshly-deployed instance is healthy
 * enough to receive traffic, and whether a running instance is still
 * healthy enough to keep receiving it.
 *
 * Semantics:
 *  - 200 OK  → the process is up AND its Postgres connection is alive
 *  - 503     → the process is up but the DB is unreachable
 *
 * The DB check is a `SELECT 1` — cheap, exits fast, no side effects.
 * If Prisma's connection pool is exhausted or the DB is behind a NAT
 * that dropped the socket, this call surfaces the failure quickly
 * instead of letting user requests hang.
 */
// Railway pings /health on a short interval; keeping the throttler out
// of that path means health checks never eat into an IP's request budget
// and can never falsely trip the rate limiter.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    let dbReachable = false;
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      dbReachable = true;
    } catch {
      // Fall through — we throw below with a structured body so
      // Railway sees a 503 and doesn't route traffic to this container.
    }

    if (!dbReachable) {
      throw new ServiceUnavailableException({
        status: 'unhealthy',
        db: 'unreachable',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      db: 'reachable',
      timestamp: new Date().toISOString(),
    };
  }
}
