import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiVersion: process.env.API_VERSION ?? 'v1',
  cashierOrigins: (process.env.CASHIER_ORIGIN ?? 'https://cashier.url.com')
    .split(',').map((o) => o.trim()),
  dashboardOrigins: (process.env.DASHBOARD_ORIGIN ?? 'https://dashboard.url.com')
    .split(',').map((o) => o.trim()),
  consoleOrigins: (process.env.CONSOLE_ORIGIN ?? 'https://console.url.com')
    .split(',').map((o) => o.trim()),
}));
