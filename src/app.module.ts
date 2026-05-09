import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/datasource/prisma/prisma.module';
import { ConfigModule } from 'src/shared/config/config.module';
import { GoogleDriveModule } from './shared/google-drive/google-drive.module';
import { JwtModule } from '@nestjs/jwt';
import { UserModule, SearchModule, SupplierModule, PostModule, CategoryModule, PricingModule, SubscriptionModule, ChatModule } from '@apis';
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
    GoogleDriveModule,
    SearchModule,
    AuthModule,
    SupplierModule,
    PostModule,
    CategoryModule,
    PricingModule,
    SubscriptionModule,
    ChatModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
