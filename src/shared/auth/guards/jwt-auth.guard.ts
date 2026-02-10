import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Resolver()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
