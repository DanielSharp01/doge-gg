import { config } from 'dotenv';
import { CommandHandler } from './CommandHandler';
import { CommandParser, CustomError, ParserError } from './CommandParser';
import { DiscordBot } from './DiscordBot';
import { Game } from './Game';
import { startWebsocketServer } from './WebsocketServer';

config();

/*const game = new Game();
startWebsocketServer(game);
const discordBot = new DiscordBot(game);*/

new CommandHandler(null, null, null).testLoop();