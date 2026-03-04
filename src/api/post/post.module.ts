import { Module } from '@nestjs/common';
import { PostResolver } from './post.resolver';

import { PostService } from './post.service';

@Module({
  imports: [],
  providers: [PostResolver, PostService],
  exports: [PostResolver, PostService],
})
export class PostModule {}
