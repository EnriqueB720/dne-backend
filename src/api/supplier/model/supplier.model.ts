import { Field, ObjectType } from '@nestjs/graphql';
import { Post } from 'src/api/post/model';
import { User } from 'src/api/user/model';

@ObjectType()
export class Supplier {
  @Field()
  supplierId: number;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field()
  companyName: string;

  @Field(() => [Post], { nullable: true })
  posts?: Post[];
}
