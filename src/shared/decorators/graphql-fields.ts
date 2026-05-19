import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import * as graphqlFields from 'graphql-fields';

export interface IGraphQLFields<T> {
  fields: T;
}

/**
 * GraphQL fields that are exposed as object/list types in the schema but are
 * backed by a Prisma `Json` column. We still want to fetch them, but Prisma
 * rejects nested `select` on JSON — it only accepts `{ field: true }`. So
 * the decorator must NOT recurse into the GraphQL sub-selection for these.
 *
 * The error you'd see otherwise is Prisma's `SelectionSetOnScalar`.
 */
const JSON_BACKED_FIELDS = new Set<string>([
  'offeredSlots',
]);

/**
 * Convert the GraphQL field tree returned by graphql-fields() into a Prisma
 * `select` object.
 *
 * Apollo Client auto-injects `__typename` at every level for cache normalization.
 * That field doesn't exist on Prisma models, so we strip it out at every depth
 * before walking the tree. Without this, the reducer's accumulator gets
 * corrupted as soon as __typename is processed, and nested relation keys get
 * dropped from the final select.
 */
const parsePrismaSelect = (example: Record<string, any>): { select: Record<string, any> } => {
  const keys = Object.keys(example).filter((k) => k !== '__typename');

  return keys.reduce(
    (acc, key) => {
      const field = example[key];
      const childKeys = Object.keys(field).filter((k) => k !== '__typename');

      // JSON-backed fields: always select with `true` (Prisma can't take
      // a nested select on JSON, even when the GraphQL query asks for
      // sub-fields).
      if (JSON_BACKED_FIELDS.has(key)) {
        return { select: { ...acc.select, [key]: true } };
      }

      if (childKeys.length === 0) {
        // Scalar — `{ key: true }`
        return { select: { ...acc.select, [key]: true } };
      }

      // Relation / nested object — recurse
      return {
        select: {
          ...acc.select,
          [key]: parsePrismaSelect(field),
        },
      };
    },
    { select: {} as Record<string, any> },
  );
};

export const GraphQLFields: () => ParameterDecorator = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const fields = parsePrismaSelect(graphqlFields(ctx.getInfo()));

    return { fields };
  },
);
