import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/api/user/model';

@ObjectType()
export class LoginOutput {
  @Field(() => String)
  access_token: string;

  @Field(() => Date)
  expiresAt: Date;

  @Field(() => User)
  user: User;
}
