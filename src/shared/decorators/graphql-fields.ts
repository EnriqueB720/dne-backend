import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import * as graphqlFields from 'graphql-fields';

export interface IGraphQLFields<T> {
  fields: T;
}

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
