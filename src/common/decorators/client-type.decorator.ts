import { SetMetadata } from '@nestjs/common';
import { ClientType } from '@common/guards/client-type.guard';

export const CLIENT_TYPE_KEY = 'clientType';
export const ForClient = (type: ClientType) =>
  SetMetadata(CLIENT_TYPE_KEY, type);
