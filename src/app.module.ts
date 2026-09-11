import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './shared/datasource/prisma/prisma.module';
import { ConfigModule } from 'src/shared/config/config.module';
import { GoogleDriveModule } from './shared/google-drive/google-drive.module';
import { PubSubModule } from './shared/pubsub/pubsub.module';
import { JwtModule } from '@nestjs/jwt';
import { GqlThrottlerGuard } from './shared/throttler/gql-throttler.guard';
import { UserModule, SearchModule, SupplierModule, PostModule, CategoryModule, PricingModule, SubscriptionModule, ChatModule, RequestModule, QuoteModule, BookingModule, CalendarEventModule, ConversationModule, NotificationModule, FavoriteModule, CustomerModule, AdminModule, EmbeddingModule, ReviewModule, ServiceModule } from '@apis';
import { AuthModule } from './shared/auth/auth.module';
import { HealthModule } from './shared/health/health.module';
import { EmailModule } from './shared/email/email.module';


@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
    }),
    // Global rate-limit ceiling — a permissive default that stops any
    // one IP from hammering the API. Per-endpoint overrides (much
    // tighter) live on individual mutations via @Throttle().
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
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
    EmbeddingModule,
    ReviewModule,
    ServiceModule,
    HealthModule,
    EmailModule,
  ],
  controllers: [],
  providers: [
    // Globally apply the GraphQL-aware throttler guard. Individual
    // resolvers can tighten with @Throttle() or opt out with
    // @SkipThrottle() (e.g. /health).
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class AppModule {}
