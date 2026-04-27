import { registerAs } from '@nestjs/config';

export default registerAs('printer', () => ({
  /** tcp://192.168.1.100:9100  OR  /dev/usb/lp0  OR  //HOST/ShareName */
  interface: process.env.PRINTER_INTERFACE ?? '',
  /** EPSON | STAR  (default EPSON covers most thermal printers) */
  type: process.env.PRINTER_TYPE ?? 'EPSON',
  /** Disable without touching code — set PRINTER_ENABLED=false in .env */
  enabled: process.env.PRINTER_ENABLED !== 'false',
  storeName: process.env.PRINTER_STORE_NAME ?? 'POS Store',
  storeAddress: process.env.PRINTER_STORE_ADDRESS ?? '',
  storePhone: process.env.PRINTER_STORE_PHONE ?? '',
}));
