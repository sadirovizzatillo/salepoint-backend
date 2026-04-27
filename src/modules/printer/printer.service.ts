import * as net from 'net';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import { Order } from '@modules/orders/entities/order.entity';

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  constructor(private readonly config: ConfigService) {}

  async printReceipt(order: Order): Promise<void> {
    if (!this.config.get<boolean>('printer.enabled')) return;

    const iface = this.config.get<string>('printer.interface');
    if (!iface) {
      this.logger.warn('PRINTER_INTERFACE is not set — skipping print');
      return;
    }

    const printerTypeStr = this.config.get<string>('printer.type', 'EPSON').toUpperCase();
    const printerType =
      printerTypeStr === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;

    // Build ESC/POS buffer using node-thermal-printer (formatting only, no network)
    const printer = new ThermalPrinter({
      type: printerType,
      interface: 'tcp://localhost:1', // dummy — we send bytes ourselves
      characterSet: CharacterSet.PC852_LATIN2,
      breakLine: BreakLine.WORD,
    });

    try {
      this.buildReceipt(printer, order);
      const buffer = printer.getBuffer();
      await this.sendToTcpPrinter(iface, buffer);
      this.logger.log(`Receipt printed for order ${order.orderNumber}`);
    } catch (err) {
      // Print failure must NEVER crash the order request
      this.logger.error(`Failed to print receipt for ${order.orderNumber}: ${err.message}`);
    }
  }

  /** Opens a raw TCP socket, writes ESC/POS bytes, then closes — no library magic. */
  private sendToTcpPrinter(iface: string, buffer: Buffer): Promise<void> {
    // iface format: tcp://192.168.7.12:9100
    const url = iface.replace('tcp://', '');
    const [host, portStr] = url.split(':');
    const port = parseInt(portStr ?? '9100', 10);

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = 15000;

      socket.setTimeout(timeout);

      socket.connect(port, host, () => {
        socket.write(buffer, (err) => {
          if (err) {
            socket.destroy();
            return reject(err);
          }
          socket.end();
          resolve();
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Socket timeout'));
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
  }

  private buildReceipt(printer: ThermalPrinter, order: Order): void {
    const storeName    = this.config.get<string>('printer.storeName', 'POS Store');
    const storeAddress = this.config.get<string>('printer.storeAddress', '');
    const storePhone   = this.config.get<string>('printer.storePhone', '');
    const LINE         = '------------------------------------------------';

    // ── Header ────────────────────────────────────────────────
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(storeName);
    printer.bold(false);
    printer.setTextNormal();

    if (storeAddress) printer.println(storeAddress);
    if (storePhone)   printer.println(storePhone);

    printer.drawLine();

    // ── Order meta ────────────────────────────────────────────
    printer.alignLeft();
    const date = new Date(order.createdAt);
    printer.println(`Date   : ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    printer.println(`Order  : ${order.orderNumber}`);
    printer.println(`Cashier: ${order.cashier?.name ?? '-'}`);
    if (order.customer?.name) {
      printer.println(`Customer: ${order.customer.name}`);
    }

    printer.println(LINE);

    // ── Column header ─────────────────────────────────────────
    printer.tableCustom([
      { text: 'Item',  align: 'LEFT',  width: 0.5 },
      { text: 'Qty',   align: 'CENTER', width: 0.15 },
      { text: 'Price', align: 'RIGHT',  width: 0.17 },
      { text: 'Total', align: 'RIGHT',  width: 0.18 },
    ]);
    printer.println(LINE);

    // ── Line items ────────────────────────────────────────────
    for (const item of order.items) {
      printer.tableCustom([
        { text: item.name,                       align: 'LEFT',   width: 0.5 },
        { text: String(item.quantity),           align: 'CENTER', width: 0.15 },
        { text: this.fmt(item.price),            align: 'RIGHT',  width: 0.17 },
        { text: this.fmt(item.lineTotal),        align: 'RIGHT',  width: 0.18 },
      ]);
    }

    printer.println(LINE);

    // ── Totals ────────────────────────────────────────────────
    printer.alignRight();
    printer.println(`Subtotal : ${this.fmt(order.subtotal)}`);

    if (Number(order.taxAmount) > 0)
      printer.println(`Tax      : ${this.fmt(order.taxAmount)}`);

    if (Number(order.discountAmount) > 0)
      printer.println(`Discount : -${this.fmt(order.discountAmount)}`);

    printer.bold(true);
    printer.println(`TOTAL    : ${this.fmt(order.total)}`);
    printer.bold(false);

    printer.println(LINE);

    // ── Payment breakdown ─────────────────────────────────────
    if (Number(order.paidByCash) > 0)
      printer.println(`Cash     : ${this.fmt(order.paidByCash)}`);
    if (Number(order.paidByCard) > 0)
      printer.println(`Card     : ${this.fmt(order.paidByCard)}`);
    if (Number(order.notPaid) > 0) {
      printer.bold(true);
      printer.println(`Debt     : ${this.fmt(order.notPaid)}`);
      printer.bold(false);
    } else {
      const change = Math.max(
        0,
        Number(order.paidByCash) + Number(order.paidByCard) - Number(order.total),
      );
      if (change > 0)
        printer.println(`Change   : ${this.fmt(change)}`);
    }

    // ── Footer ────────────────────────────────────────────────
    printer.alignCenter();
    printer.drawLine();
    printer.println('Thank you! Come again!');
    printer.newLine();
    printer.cut();
  }

  private fmt(value: number | string): string {
    return Number(value).toFixed(2);
  }
}
