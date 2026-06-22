import { Module } from '@nestjs/common';
import { FavoriteResolver } from './favorite.resolver';
import { FavoriteService } from './favorite.service';

@Module({
  imports: [],
  providers: [FavoriteResolver, FavoriteService],
  exports: [FavoriteResolver, FavoriteService],
})
export class FavoriteModule {}
