import { Module } from '@nestjs/common';
import { CategoryResolver } from './category.resolver';
import { CategoryService } from './category.service';

@Module({
  imports: [],
  providers: [CategoryResolver, CategoryService],
  exports: [CategoryResolver, CategoryService],
})
export class CategoryModule {}
