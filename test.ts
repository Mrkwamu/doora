import { parseCommand } from './src/commands/commands.parser';

const messages = [
  'ADD     Google  ',
  '',
  'remove Netflix.com dhdjd',
  'pause Microsoft',
  'resume Spotify',
  'search Flutter',
  'list',
  'help',
  'hello world',
];

for (const message of messages) {
  console.log(`Input: "${message}"`);
  console.log(parseCommand(message));
  console.log('--------------------');
}
