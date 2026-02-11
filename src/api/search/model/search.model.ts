import { Field, ObjectType } from '@nestjs/graphql';
import { Post } from 'src/api/post/model';


@ObjectType()
export class Search {
    @Field(() => [Post], {nullable: true})
    Post?: Post[];
}