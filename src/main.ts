// MUST be first — Sentry patches http/express/pg drivers at import
// time, so it has to load before any of those get imported.
import './instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './shared/config/config.service';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { json } from 'express';
import 'reflect-metadata';

async function bootstrap() {
  // bufferLogs=true holds early framework log lines until we swap the
  // logger to pino — otherwise startup messages print with the default
  // NestJS logger and look inconsistent from everything after.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const config = app.get<ConfigService>(ConfigService);

  const PORT = config.get('PORT') as number;

  app.enableCors();
  // Enforce class-validator rules on every input (MaxLength on chat
  // prompts, IsEmail on supplier contacts, ...). Must run before listen().
  // forbidUnknownValues off: some inputs carry no validator decorators.
  app.useGlobalPipes(new ValidationPipe({ forbidUnknownValues: false }));
  app.use(json({ limit: '2mb' }));

  await app.listen(PORT);

  app.get(PinoLogger).log(`App running on port ${PORT}`, 'Bootstrap');
}
bootstrap();
