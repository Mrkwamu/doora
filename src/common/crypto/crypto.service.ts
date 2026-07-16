import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly hmacSecret: string;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.getOrThrow<string>('HMAC_SECRET_KEY');

    this.hmacSecret = secret;
  }

  generateHmac(data: string, secret?: string): string {
    const hmacSecret = secret ?? this.hmacSecret;
    return createHmac('sha256', hmacSecret).update(data).digest('hex');
  }

  // verifyHmac(data: string, hmacHash: string): boolean {
  //   const computed = Buffer.from(this.generateHmac(data), 'hex');
  //   const expected = Buffer.from(hmacHash, 'hex');

  //   if (computed.length !== expected.length) return false;

  //   return crypto.timingSafeEqual(computed, expected);
  // }
}
