import * as dotenv from 'dotenv';
import * as fs from 'fs';

import { InternalServerErrorException } from '@nestjs/common';

import Environment from './model/environment.enum';
import EnvVariablesSchema, { EnvVariables } from './model/env-variables.model';

export class ConfigService {
  private readonly envVariables: EnvVariables;

  constructor(filePath: string) {
    // Local dev keeps values in a physical .env.<NODE_ENV> file. Platforms
    // like Railway inject env vars directly into process.env and never
    // create that file — so loading it is optional, not required. Missing
    // file just means "nothing extra to merge in," not an error.
    let fileConfig: Record<string, string> = {};
    if (fs.existsSync(filePath)) {
      fileConfig = dotenv.parse(fs.readFileSync(filePath));
    }

    // dotenv.config() additionally populates process.env from the same
    // file for any code that reads process.env directly elsewhere in the
    // app; also a no-op when the file doesn't exist.
    dotenv.config({ path: filePath });

    // process.env wins over the file so a platform-injected value can
    // never be shadowed by a stale local file that happened to ship in
    // the image.
    const merged = { ...fileConfig, ...process.env };
    this.envVariables = this.validateInput(merged);

    this.get = this.get.bind(this);
  }

  public get(key: keyof EnvVariables): string | number | boolean {
    return this.envVariables[key];
  }

  public get environment(): Environment {
    return this.envVariables.NODE_ENV;
  }

  private validateInput(envVariables): EnvVariables {
    // allowUnknown: the real process.env carries dozens of vars we don't
    // declare (PATH, HOME, every RAILWAY_* the platform injects, etc.) —
    // only the ones in EnvVariablesSchema are validated/required.
    // stripUnknown: keep `this.envVariables` limited to the declared
    // shape so `.get()` can't accidentally leak platform internals.
    const { error, value } = EnvVariablesSchema.validate(envVariables, {
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      throw new InternalServerErrorException(
        `Config validation error: ${error.message}`,
      );
    }

    return value;
  }
}
