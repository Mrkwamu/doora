import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { WebhookModule } from './webhook/webhook.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { CommandsModule } from './commands/commands.module';
import { ScraperModule } from './scraper/scraper.module';

@Module({
  imports: [
    PrismaModule,

    WhatsappModule,
    WebhookModule,
    CryptoModule,
    CommandsModule,
    ScraperModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
  ],
  controllers: [],
})
export class AppModule {}
