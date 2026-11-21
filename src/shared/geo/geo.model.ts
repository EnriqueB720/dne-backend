import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A province / state (ISO 3166-2)' })
export class Province {
  /** e.g. "CR-H" */
  @Field()
  code: string;

  /** e.g. "Heredia" */
  @Field()
  name: string;

  /** ISO 3166-1 alpha-2, e.g. "CR" */
  @Field()
  country: string;
}

@ObjectType({ description: 'A province worked out from text or device coordinates' })
export class ResolvedProvince extends Province {
  /** 'explicit' (picked), 'text' (named in the message) or 'device' (GPS). */
  @Field()
  source: string;
}
