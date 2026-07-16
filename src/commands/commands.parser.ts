import { Command } from './commands.enum';
import { ParsedCommand } from './commands.types';

export function parseCommand(message: string): ParsedCommand {
  const [rawAction, ...rest] = message.trim().split(/\s+/);

  const action = rawAction.toLowerCase() as Command;
  const argument = rest.join(' ');

  if (!Object.values(Command).includes(action)) {
    return { action: Command.UNKNOWN };
  }

  switch (action) {
    case Command.ADD:
    case Command.REMOVE:
    case Command.RESUME:
    case Command.PAUSE:
    case Command.SEARCH:
      return {
        action,
        argument: argument.length > 0 ? argument : undefined,
      };

    case Command.HELP:
    case Command.LIST:
      return {
        action,
      };

    default:
      return { action: Command.UNKNOWN };
  }
}
