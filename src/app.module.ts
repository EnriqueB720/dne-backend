import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/datasource/prisma/prisma.module';
import { ConfigModule } from 'src/shared/config/config.module';
import { GoogleDriveModule } from './shared/google-drive/google-drive.module';
import { PubSubModule } from './shared/pubsub/pubsub.module';
import { JwtModule } from '@nestjs/jwt';
import { UserModule, SearchModule, SupplierModule, PostModule, CategoryModule, PricingModule, SubscriptionModule, ChatModule, RequestModule, QuoteModule, BookingModule, CalendarEventModule, ConversationModule, NotificationModule, FavoriteModule, CustomerModule, AdminModule } from '@apis';
import { AuthModule } from './shared/auth/auth.module';


@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
    }),
    ConfigModule,
    PrismaModule,
    PubSubModule,
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
    RequestModule,
    QuoteModule,
    BookingModule,
    CalendarEventModule,
    ConversationModule,
    NotificationModule,
    FavoriteModule,
    CustomerModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
