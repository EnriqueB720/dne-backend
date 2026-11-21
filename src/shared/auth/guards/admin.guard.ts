import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { PrismaService } from '@prisma-datasource';
import { IAuthUser } from '../model';

/**
 * Admin-only resolvers. Use AFTER JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 * Reads `is_admin` from the DB on every call, so revoking admin takes
 * effect immediately (the JWT carries no roles).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = GqlExecutionContext.create(context).getContext().req;
    const user = req?.user as IAuthUser | undefined;
    if (!user?.sub) throw new ForbiddenException('Admin access required');

    const row = await this.prismaService.user.findUnique({
      where: { userId: Number(user.sub) },
      select: { isAdmin: true, deletedAt: true },
    });
    if (!row || row.deletedAt || !row.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
