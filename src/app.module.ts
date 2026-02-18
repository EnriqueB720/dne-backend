import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/datasource/prisma/prisma.module';
import { ConfigModule } from 'src/shared/config/config.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './shared/auth/auth.module';
import { UserModule, PricingModule, SubscriptionModule } from '@apis';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
    }),
    ConfigModule,
    PrismaModule,
    UserModule,
    AuthModule,
    PricingModule,
    SubscriptionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
