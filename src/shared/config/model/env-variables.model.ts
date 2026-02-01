import * as Joi from 'joi';

import Environment from './environment.enum';

const { LOCAL, DEVELOPMENT, STAGING, PRODUCTION } = Environment;

interface EnvVariables {
  JWT_SECRET: string;
  NODE_ENV: Environment;
  PORT: number;
  DATABASE_URL: string;
}

const ENV_VARIABLES_SCHEMA = Joi.object<EnvVariables>({
  NODE_ENV: Joi.string()
    .valid(LOCAL, DEVELOPMENT, STAGING, PRODUCTION)
    .default(LOCAL),
  PORT: Joi.number().default(5000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
});

export { EnvVariables };

export default ENV_VARIABLES_SCHEMA;
