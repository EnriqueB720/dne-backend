import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import * as graphqlFields from 'graphql-fields';

export interface IGraphQLFields<T> {
  fields: T;
}

const parsePrismaSelect = (example) =>
  Object.keys(example).reduce(
    ({ select }, key) => {
      const field = example[key];
      const child = Object.keys(field);

      if (key === '__typename') {
        return select;
      }
      if (!child.length) {
        return { select: { ...select, [key]: true } };
      } else {
        return {
          select: {
            ...select,
            [key]: parsePrismaSelect(field),
          },
        };
      }
    },
    { select: {} },
  );

export const GraphQLFields: () => ParameterDecorator = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const fields = parsePrismaSelect(graphqlFields(ctx.getInfo()));

    return { fields };
  },
);
