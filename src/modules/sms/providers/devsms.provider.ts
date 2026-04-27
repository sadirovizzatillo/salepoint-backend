import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { SmsProvider, SmsProviderResult } from './sms.provider.interface';

@Injectable()
export class DevSmsProvider implements SmsProvider {
  private readonly logger = new Logger(DevSmsProvider.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async send(phone: string, message: string): Promise<SmsProviderResult> {
    const token       = this.config.get<string>('sms.token');
    const from        = this.config.get<string>('sms.from');
    const baseUrl     = this.config.get<string>('sms.baseUrl');
    const callbackUrl = this.config.get<string>('sms.callbackUrl');

    const payload = { phone, message, from, callback_url: callbackUrl };
    this.logger.debug(`REQUEST → POST ${baseUrl}/send_sms.php | token=${token?.slice(0, 6)}... | body=${JSON.stringify(payload)}`);

    let response: AxiosResponse;
    try {
      response = await firstValueFrom(
        this.http.post(
          `${baseUrl}/send_sms.php`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const data   = err?.response?.data;
      this.logger.error(`RESPONSE ← ${status} | body=${JSON.stringify(data)}`);
      throw err;
    }

    const body = response.data as Record<string, any>;
    this.logger.debug(`RESPONSE ← ${response.status} | body=${JSON.stringify(body)}`);

    if (!body.success) {
      throw new Error(body.error ?? 'DevSMS: unknown error');
    }

    return {
      smsId:      body.data.sms_id,
      requestId:  body.data.request_id,
      status:     body.data.status,
      partsCount: body.data.parts_count,
      totalCost:  body.data.total_cost,
    };
  }

  async getBalance(): Promise<{ balance: number; smsPrice: number }> {
    const token   = this.config.get<string>('sms.token');
    const baseUrl = this.config.get<string>('sms.baseUrl');

    const response: AxiosResponse = await firstValueFrom(
      this.http.get(`${baseUrl}/get_balance.php`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const { balance, sms_price } = (response.data as Record<string, any>).data;
    return { balance, smsPrice: sms_price };
  }
}
