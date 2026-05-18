import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ConfigService } from './config.service';

import Environment from './model/environment.enum';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: new ConfigService(
        `.env.${process.env.NODE_ENV || Environment.LOCAL}`,
      ),
    },
  ],
  exports: [ConfigService],
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: 'schema.gql',
      graphiql: true,
      driver: ApolloDriver,
      // Enable GraphQL subscriptions over the WebSocket (graphql-ws) transport
      // on the same /graphql endpoint. The client connects via ws:// instead
      // of http:// for `subscription` operations and the server upgrades the
      // connection in place.
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    ScheduleModule.forRoot(),
  ],
})
export class ConfigModule {
  constructor(private configService: ConfigService) {}
}
