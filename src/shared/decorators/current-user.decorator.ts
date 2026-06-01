import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IAuthUser } from '../auth/model';

/**
 * Extracts the authenticated user from the GraphQL request context.
 * Returns `null` when no token (or an invalid token) was supplied — works
 * with both `JwtAuthGuard` (strict) and `OptionalJwtAuthGuard` (lenient).
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): IAuthUser | null => {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    return (req?.user as IAuthUser | undefined) ?? null;
  },
);
