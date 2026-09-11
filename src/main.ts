// MUST be first — Sentry patches http/express/pg drivers at import
// time, so it has to load before any of those get imported.
import './instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './shared/config/config.service';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);

  const PORT = config.get('PORT') as number;

  app.enableCors();

  await app.listen(PORT);

  app.useGlobalPipes(new ValidationPipe());
  app.use(json({ limit: '150mb' }));

  Logger.log(`App Running in port ${PORT}`, 'App Initialization');
}
bootstrap();
