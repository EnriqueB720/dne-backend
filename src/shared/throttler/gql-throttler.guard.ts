import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * The stock ThrottlerGuard reads req/res from an Express-shaped
 * ExecutionContext, which doesn't exist for GraphQL resolvers (they
 * carry req/res inside a `context` object instead). This override
 * pulls the underlying Express request out of the GraphQL context so
 * the throttler can key on the client IP and set Retry-After headers
 * the same way it would for a REST controller.
 *
 * REST controllers (like /health) still work — when
 * `getType()` returns 'http', the parent class handles it natively.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    if (context.getType<'http' | 'graphql'>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const { req, res } = gqlCtx.getContext<{
        req: any;
        res: any;
      }>();
      return { req, res };
    }
    return super.getRequestResponse(context);
  }
}
