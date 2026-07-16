import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';
import { verifyWebhookQuery } from './type/webhook.type';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  @Post()
  receiveWebhook(
    @Req() req: Request,
    @Headers('X-Hub-Signature-256') signature: string,
    @Body() body: any,
  ) {
    const rawBody = req.rawBody?.toString() ?? '';

    const verified = this.service.verifyWebhookSignature(rawBody, signature);

    if (!verified) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    console.log(body);

    return {
      success: true,
    };
  }

  @Get()
  verifyWebhook(@Query() query: verifyWebhookQuery) {
    const verifyToken = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const isValid = this.service.verifyWebhook(verifyToken);

    if (!isValid) {
      throw new BadRequestException('Invalid verify token');
    }

    return challenge;
  }
}
