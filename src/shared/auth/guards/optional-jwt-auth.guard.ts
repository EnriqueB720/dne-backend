import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT guard that allows unauthenticated requests through.
 *
 * If a valid token is present, `request.user` is populated (same payload as
 * the strict JwtAuthGuard); if no/invalid token is present we simply return
 * `null` for the user instead of throwing — useful for endpoints that should
 * work for both authenticated users and guests (e.g. AI chat with deviceId
 * fallback).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  handleRequest<T = unknown>(_err: unknown, user: T | false): T | null {
    return user || null;
  }
}
