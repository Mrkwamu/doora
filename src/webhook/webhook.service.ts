import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../common/crypto/crypto.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  verifyWebhook(hubVerifyToken: string): boolean {
    const expectedToken = this.config.getOrThrow<string>(
      'WHATSAPP_VERIFY_TOKEN',
    );

    return expectedToken === hubVerifyToken;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!rawBody) {
      throw new BadRequestException('Payload is missing');
    }

    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature.');
    }

    const appSecret = this.config.getOrThrow<string>('META_APP_SECRET');
    const expectedSignature = this.crypto.generateHmac(rawBody, appSecret);
    const [, receivedSignature] = signature.split('=');

    if (!receivedSignature) {
      throw new UnauthorizedException('Invalid signature format.');
    }

    const expected = Buffer.from(expectedSignature, 'hex');
    const received = Buffer.from(receivedSignature, 'hex');

    if (expected.length !== received.length) {
      return false;
    }

    console.log(rawBody);

    return crypto.timingSafeEqual(expected, received);
  }
}
