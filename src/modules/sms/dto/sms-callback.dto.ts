import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class SmsCallbackDto {
  @IsInt()
  sms_id: number;

  @IsString()
  request_id: string;

  @IsString()
  phone: string;

  @IsIn(['sent', 'delivered', 'failed'])
  status: 'sent' | 'delivered' | 'failed';

  @IsOptional()
  @IsString()
  sent_at?: string;

  @IsOptional()
  @IsString()
  delivered_at?: string;

  @IsOptional()
  @IsString()
  failed_at?: string;

  @IsString()
  timestamp: string;
}
