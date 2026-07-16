import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetWatchedCompanies } from './commands.types';
import { parseCommand } from './commands.parser';
import { Command } from './commands.enum';

@Injectable()
export class CommandsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWatchedCompaniesCommand(
    userId: string,
  ): Promise<GetWatchedCompanies[]> {
    const watches = await this.prisma.watch.findMany({
      where: {
        userId,
        isDeleted: false,
      },

      select: {
        role: true,
        company: {
          select: {
            companyName: true,
            careerUrl: true,
          },
        },
      },
    });

    return watches.map((watch) => ({
      companyName: watch.company.companyName,
      careerUrl: watch.company.careerUrl,
      role: watch.role,
    }));
  }

  async removeCompanyWatchCommand(userId: string, company: string) {
    return this.prisma.watch.updateMany({
      where: {
        userId,
        isDeleted: false,
        company: {
          companyName: company,
        },
      },
      data: {
        isDeleted: true,
      },
    });
  }

  async pauseCompanyWatch(userId: string, company: string) {
    return this.prisma.watch.updateMany({
      where: {
        userId,
        isDeleted: false,
        isPaused: false,
        company: {
          companyName: company,
        },
      },
      data: {
        isPaused: true,
      },
    });
  }

  async resumeCompanyWatch(userId: string, company: string) {
    return this.prisma.watch.updateMany({
      where: {
        userId,
        isDeleted: false,
        isPaused: true,
        company: {
          companyName: company,
        },
      },
      data: {
        isPaused: false,
      },
    });
  }

  async helpCommand(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const greetingName = user?.name?.trim() || 'there';

    return `Hi ${greetingName}! 👋

Here's everything Doora can do:

➕ *add <company>*
Start watching a company's careers page.
Example: add paystack.com

➖ *remove <company>*
Stop watching a company.
Example: remove paystack.com

📋 *list*
See everything you're currently watching.

⏸️ *pause <company>*
Temporarily stop alerts for a company without removing it.
Example: pause paystack.com

▶️ *resume <company>*
Resume alerts for a paused company.
Example: resume paystack.com

❓ *help*
Show this message again.

Just send any of these, anytime.`;
  }

  async commandHandler(userId: string, message: string) {
    if (!message.trim()) {
      return 'Please send a message.';
    }

    const { action, argument } = parseCommand(message);

    switch (action) {
      case Command.PAUSE: {
        if (!argument) {
          return 'Please tell me which company to pause. Example: pause paystack.com';
        }
        const result = await this.pauseCompanyWatch(userId, argument);

        if (result.count === 0) {
          return `You're not actively watching ${argument}, or it's already paused.`;
        }

        return `⏸️ Paused alerts for ${argument} (${result.count} role${result.count > 1 ? 's' : ''}).`;
      }
      case Command.RESUME: {
        if (!argument) {
          return 'Please tell me which company to resume. Example: resume paystack.com';
        }

        const result = await this.resumeCompanyWatch(userId, argument);

        if (result.count === 0) {
          return `${argument} isn't currently paused.`;
        }

        return `▶️ Resumed alerts for ${argument} (${result.count} role${result.count > 1 ? 's' : ''}).`;
      }
      case Command.LIST: {
        const watches = await this.getWatchedCompaniesCommand(userId);

        if (watches.length === 0) {
          return 'You\'re not watching any companies yet. Try "add <company url>".';
        }

        const lines = watches.map(
          (w, index) =>
            `${index + 1}. ${w.companyName} - ${w.role}\n${w.careerUrl}`,
        );

        return `You're currently watching\n\n${lines.join('\n\n')}`;
      }
      case Command.HELP: {
        return this.helpCommand(userId);
      }

      case Command.ADD:
      case Command.REMOVE:
      case Command.SEARCH:
        return "This command isn't implemented yet.";
    }
  }
}
