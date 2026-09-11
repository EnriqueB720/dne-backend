import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
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


const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // Sentry must sit at the top of the import list so its instrumentation
    // is armed before other modules initialize.
    SentryModule.forRoot(),
    // Structured logging via pino. In prod, emits one JSON line per log
    // record — Railway's log viewer parses those into filterable fields.
    // In dev, pipes through pino-pretty for readable colorized output.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
        // Auto-log request start/end with method, path, status,
        // latency, and a per-request id (also propagated to child
        // loggers inside resolvers). Silenced on /health to keep the
        // noise floor low — Railway pings that endpoint frequently.
        autoLogging: {
          ignore: (req) => (req.url ?? '').startsWith('/health'),
        },
        // Strip common auth headers from the logged payload so tokens
        // don't leak into log storage.
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          censor: '[REDACTED]',
        },
        transport: isProd
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname,req,res,responseTime',
              },
            },
      },
    }),
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
    // Sentry's exception filter reports unhandled errors to Sentry
    // BEFORE NestJS's default handler serializes them. Registered
    // first so it wraps every other filter.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    // Globally apply the GraphQL-aware throttler guard. Individual
    // resolvers can tighten with @Throttle() or opt out with
    // @SkipThrottle() (e.g. /health).
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class AppModule {}
