import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './shared/config/config.service';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { config } from 'dotenv'

config({ path: '.env.local' })

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
