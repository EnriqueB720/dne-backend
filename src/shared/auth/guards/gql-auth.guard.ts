import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Resolver()
export class GqlAuthGuard extends AuthGuard('local') {
  constructor() {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext();
    request.body = ctx.getArgs().data;
    return request;
  }
}
