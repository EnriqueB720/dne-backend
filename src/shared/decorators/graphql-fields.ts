import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import * as graphqlFields from 'graphql-fields';

export interface IGraphQLFields<T> {
  fields: T;
}

/**
 * GraphQL fields that are NOT columns: they're computed by a
 * `@ResolveField` from other columns. The decorator swaps each one for the
 * columns it needs, so the Prisma select stays valid and the resolver has
 * its inputs. Keep in sync with SupplierResolver's @ResolveField methods.
 *
 * Why: a fact is stored once (`verifiedAt`), but the API can still offer
 * the convenient shape (`verified: Boolean`).
 */
const COMPUTED_FIELDS: Record<string, string[]> = {
  verified: ['verifiedAt'],
  preferred: ['preferredAt', 'preferredUntil'],
  provinceName: ['province'],
  serviceProvinceNames: ['serviceProvinces'],
};

/**
 * Convert the GraphQL field tree returned by graphql-fields() into a Prisma
 * `select` object.
 *
 * Apollo Client auto-injects `__typename` at every level for cache
 * normalization; it isn't a Prisma field, so it's stripped at every depth.
 */
export const parsePrismaSelect = (example: Record<string, any>): { select: Record<string, any> } => {
  const select: Record<string, any> = {};

  for (const key of Object.keys(example)) {
    if (key === '__typename') continue;

    const deps = COMPUTED_FIELDS[key];
    if (deps) {
      for (const dep of deps) select[dep] = select[dep] ?? true;
      continue;
    }

    const field = example[key];
    const childKeys = Object.keys(field).filter((k) => k !== '__typename');
    select[key] = childKeys.length === 0 ? true : parsePrismaSelect(field);
  }

  return { select };
};

export const GraphQLFields: () => ParameterDecorator = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const fields = parsePrismaSelect(graphqlFields(ctx.getInfo()));

    return { fields };
  },
);
