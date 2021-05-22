import { config } from 'dotenv';
import { DiscordBot } from './DiscordBot';
import { Game } from './Game';
import { startWebsocketServer } from './WebsocketServer';

config();

const game = new Game();
startWebsocketServer(game);
const discordBot = new DiscordBot(game);