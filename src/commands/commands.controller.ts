import { Body, Controller, Post } from '@nestjs/common';
import { CommandsService } from './commands.service';

@Controller('commands')
export class CommandsController {
  constructor(private readonly service: CommandsService) {}

  @Post('test')
  test(@Body() body: { userId: string; message: string }) {
    return this.service.commandHandler(body.userId, body.message);
  }
}
