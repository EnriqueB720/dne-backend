import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql';
import { SupplierService } from './supplier.service';
import { Supplier, SupplierDashboardStats, SupplierSelect } from './model';
import {
  SupplierArgs,
  SupplierCategoriesInput,
  SupplierCreateInput,
  SupplierMediaDeleteInput,
  SupplierMediaReorderInput,
  SupplierSearchInput,
  SupplierUpdateInput,
} from './dto';
import { GraphQLFields, IGraphQLFields } from '@decorators';

@Resolver(() => Supplier)
export class SupplierResolver {
  constructor(private readonly supplierService: SupplierService) {}

  @Query(() => Supplier)
  public async supplier(
    @Args() args: SupplierArgs,
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier> {
    return await this.supplierService.findOne(args, fields);
  }

  @Query(() => [Supplier])
  public async suppliers(
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier[]> {
    return await this.supplierService.findMany(fields);
  }

  @Query(() => [Supplier])
  public async searchSuppliers(
    @Args('data') data: SupplierSearchInput,
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier[]> {
    return await this.supplierService.search(data, fields);
  }

  @Mutation(() => Supplier)
  public async createSupplier(
    @Args('data') data: SupplierCreateInput,
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier> {
    return await this.supplierService.create(data, fields);
  }

  @Mutation(() => Supplier)
  public async updateSupplier(
    @Args('data') data: SupplierUpdateInput,
    @GraphQLFields() { fields }: IGraphQLFields<SupplierSelect>,
  ): Promise<Supplier> {
    return await this.supplierService.update(data, fields);
  }

  /** Replace the supplier's category badges. Send the complete selection. */
  @Mutation(() => Boolean)
  public async setSupplierCategories(
    @Args('data') data: SupplierCategoriesInput,
  ): Promise<boolean> {
    return await this.supplierService.setCategories(data);
  }

  /** Remove one photo from the supplier's storefront gallery. */
  @Mutation(() => Boolean)
  public async deleteSupplierMedia(
    @Args('data') data: SupplierMediaDeleteInput,
  ): Promise<boolean> {
    return await this.supplierService.deleteMedia(data);
  }

  /** Persist a new gallery order — index 0 becomes the hero tile. */
  @Mutation(() => Boolean)
  public async reorderSupplierMedia(
    @Args('data') data: SupplierMediaReorderInput,
  ): Promise<boolean> {
    return await this.supplierService.reorderMedia(data);
  }

  /** Aggregate metrics for the supplier workspace dashboard. */
  @Query(() => SupplierDashboardStats)
  public async supplierDashboardStats(
    @Args('supplierId', { type: () => Int }) supplierId: number,
  ): Promise<SupplierDashboardStats> {
    return await this.supplierService.getDashboardStats(supplierId);
  }
}
