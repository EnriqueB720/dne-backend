import * as Joi from 'joi';

import Environment from './environment.enum';

const { LOCAL, DEVELOPMENT, STAGING, PRODUCTION } = Environment;

interface EnvVariables {
  JWT_SECRET: string;
  NODE_ENV: Environment;
  PORT: number;
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
  GOOGLE_DRIVE_POSTS_FOLDER_ID: string;
  GOOGLE_REFRESH_TOKEN: string;
}

const ENV_VARIABLES_SCHEMA = Joi.object<EnvVariables>({
  NODE_ENV: Joi.string()
    .valid(LOCAL, DEVELOPMENT, STAGING, PRODUCTION)
    .default(LOCAL),
  PORT: Joi.number().default(5000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_DRIVE_FOLDER_ID: Joi.string().required(),
  GOOGLE_DRIVE_POSTS_FOLDER_ID: Joi.string().required(),
  GOOGLE_REFRESH_TOKEN: Joi.string().required(),
});

export { EnvVariables };

export default ENV_VARIABLES_SCHEMA;
