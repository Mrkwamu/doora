import { Request } from 'express';

export interface verifyWebhookQuery {
  'hub.mode': string;
  'hub.challenge': string;
  'hub.verify_token': string;
}

export interface RawBodyRequest extends Request {
  rawBody: Buffer;
}
