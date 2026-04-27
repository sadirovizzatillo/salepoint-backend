export interface SmsProviderResult {
  smsId: number;
  requestId: string;
  status: string;
  partsCount: number;
  totalCost: number;
}

export interface SmsProvider {
  send(phone: string, message: string): Promise<SmsProviderResult>;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';
