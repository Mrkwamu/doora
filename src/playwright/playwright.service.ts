import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Browser, chromium } from 'playwright';

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private browser!: Browser;

  async onModuleInit() {
    console.log('Launching browser...');
    this.browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
    });

    console.log('Browser launched');
  }

  getBrowser(): Browser {
    return this.browser;
  }

  async onModuleDestroy() {
    await this.browser.close();
    console.log('Browser closed');
  }
}
