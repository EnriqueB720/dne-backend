import { Module, Global } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
  imports: [],
})
export class PrismaModule {
  constructor(private prismaService: PrismaService) {}
}
