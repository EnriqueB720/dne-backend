import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AdminGuard, JwtAuthGuard } from '../../shared/auth/guards';
import { AdminService } from './admin.service';
import { AdminPreferredInput, AdminSupplierFilter } from './dto/admin.input';
import { AdminOverview, AdminSupplierPage } from './model/admin.model';

/** Admin-only. The caller's token must belong to a user with `is_admin`. */
@Resolver()
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  /** Dashboard: new suppliers/customers, contacts, provinces, top suppliers. */
  @Query(() => AdminOverview)
  adminOverview(
    @Args('days', { type: () => Int, nullable: true, defaultValue: 30 }) days: number,
  ): Promise<AdminOverview> {
    return this.adminService.overview(days);
  }

  /** Supplier table behind the Verification and Preferred pages. */
  @Query(() => AdminSupplierPage)
  adminSuppliers(
    @Args('filter', { nullable: true }) filter: AdminSupplierFilter,
  ): Promise<AdminSupplierPage> {
    return this.adminService.suppliers(filter ?? {});
  }

  @Mutation(() => Boolean)
  adminSetSupplierVerified(
    @Args('supplierId', { type: () => Int }) supplierId: number,
    @Args('verified') verified: boolean,
  ): Promise<boolean> {
    return this.adminService.setVerified(supplierId, verified);
  }

  /** Pin a supplier to the top of search results (optionally until a date). */
  @Mutation(() => Boolean)
  adminSetSupplierPreferred(@Args('data') data: AdminPreferredInput): Promise<boolean> {
    return this.adminService.setPreferred(data);
  }
}
