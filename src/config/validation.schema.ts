import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  CASHIER_ORIGIN: Joi.string().required(),
  DASHBOARD_ORIGIN: Joi.string().required(),
  CONSOLE_ORIGIN: Joi.string().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SCHEMA: Joi.string().default('public'),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_MIN: Joi.number().default(2),
  DB_POOL_MAX: Joi.number().default(20),
  DB_SYNC: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_TTL_SECONDS: Joi.number().default(300),
  REDIS_KEY_PREFIX: Joi.string().default('pos:'),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  PRINTER_INTERFACE: Joi.string().allow('').optional(),
  PRINTER_TYPE: Joi.string().valid('EPSON', 'STAR').default('EPSON'),
  PRINTER_ENABLED: Joi.boolean().default(true),
  PRINTER_STORE_NAME: Joi.string().default('POS Store'),
  PRINTER_STORE_ADDRESS: Joi.string().allow('').optional(),
  PRINTER_STORE_PHONE: Joi.string().allow('').optional(),

  THROTTLE_TTL_SECONDS: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(120),

  DEVSMS_TOKEN: Joi.string().allow('').optional(),
  DEVSMS_FROM: Joi.string().default('4546'),
  DEVSMS_BASE_URL: Joi.string().default('https://devsms.uz/api'),
  DEVSMS_CALLBACK_URL: Joi.string().default('https://teztarqat.uz/sms/callback'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('debug'),
  LOG_DIR: Joi.string().default('./logs'),
});
