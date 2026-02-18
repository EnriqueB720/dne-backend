import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/datasource/prisma/prisma.module';
import { ConfigModule } from 'src/shared/config/config.module';
import { JwtModule } from '@nestjs/jwt';
import { UserModule, SearchModule, SupplierModule, PostModule, CategoryModule, PricingModule, SubscriptionModule } from '@apis';
import { AuthModule } from './shared/auth/auth.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
    }),
    ConfigModule,
    PrismaModule,
    UserModule,
    SearchModule,
    AuthModule,
    SupplierModule,
    PostModule,
    CategoryModule,
    PricingModule,
    SubscriptionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
