import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/datasource/prisma/prisma.module';
import { ConfigModule } from 'src/shared/config/config.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
    }),
    ConfigModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
