import { Module } from '@nestjs/common';
import { RequestResolver } from './request.resolver';
import { RequestService } from './request.service';

@Module({
  imports: [],
  providers: [RequestResolver, RequestService],
  exports: [RequestResolver, RequestService],
})
export class RequestModule {}
