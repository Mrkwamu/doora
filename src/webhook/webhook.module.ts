import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { CryptoModule } from '../common/crypto/crypto.module';

@Module({
  imports: [CryptoModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
