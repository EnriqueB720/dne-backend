import { Field, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { Post } from 'src/api/post/model';
import { User } from 'src/api/user/model';
import { Service } from 'src/api/service/model';

@ObjectType()
export class Supplier {
  @Field()
  supplierId: number;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field()
  companyName: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  tagline?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  businessPhone?: string;

  @Field({ nullable: true })
  businessEmail?: string;

  @Field({ nullable: true })
  whatsappNumber?: string;

  @Field({ nullable: true })
  websiteUrl?: string;

  @Field({ nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  rating?: Prisma.Decimal;

  @Field({ nullable: true })
  reviewCount?: number;

  @Field({ nullable: true })
  responseTimeMinutes?: number;

  @Field({ nullable: true })
  minCapacity?: number;

  @Field({ nullable: true })
  maxCapacity?: number;

  @Field({ nullable: true })
  verified?: boolean;

  @Field({ nullable: true })
  premium?: boolean;

  @Field(() => [Service], { nullable: true })
  services?: Service[];

  @Field(() => [Post], { nullable: true })
  posts?: Post[];
}
