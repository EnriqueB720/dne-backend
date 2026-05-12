import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { SupplierService } from './supplier.service';
import { Supplier, SupplierSelect } from './model';
import { SupplierArgs, SupplierCreateInput, SupplierSearchInput } from './dto';
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
}
