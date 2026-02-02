import * as dotenv from 'dotenv';
import * as fs from 'fs';

import { InternalServerErrorException } from '@nestjs/common';

import Environment from './model/environment.enum';
import EnvVariablesSchema, { EnvVariables } from './model/env-variables.model';

export class ConfigService {
  private readonly envVariables: EnvVariables;

  constructor(filePath: string) {
    dotenv.config({
      path: `.env.${process.env.NODE_ENV || 'local'}`,
    });

    const config = dotenv.parse(fs.readFileSync(filePath));
    this.envVariables = this.validateInput(config);

    this.get = this.get.bind(this);
  }

  public get(key: keyof EnvVariables): string | number | boolean {
    return this.envVariables[key];
  }

  public get environment(): Environment {
    return this.envVariables.NODE_ENV;
  }

  private validateInput(envVariables): EnvVariables {
    const { error, value } = EnvVariablesSchema.validate(envVariables);

    if (error) {
      throw new InternalServerErrorException(
        `Config validation error: ${error.message}`,
      );
    }

    return value;
  }
}
