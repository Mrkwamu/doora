import { Command } from './commands.enum';

export interface ParsedCommand {
  action: Command;
  argument?: string;
}

export interface GetWatchedCompanies {
  companyName: string;
  careerUrl: string;
  role: string;
}
