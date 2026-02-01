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
    }),
    ScheduleModule.forRoot(),
  ],
})
export class ConfigModule {
  constructor(private configService: ConfigService) {}
}