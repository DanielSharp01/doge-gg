import { config } from 'dotenv';
import { CommandHandler } from './CommandHandler';
import { connectToDiscord } from './DiscordBot';
import { GameManager } from './GameManager';
import { MessageEngine } from './MessageEngine';
import { startWebsocketServer } from './WebsocketServer';
import { SummonerCache } from './SummonerCache';

config();

const summonerCache = new SummonerCache();
const messageEngine = new MessageEngine(summonerCache);
const gameManager = new GameManager(messageEngine, summonerCache)
setInterval(() => gameManager.cleanupGames(), 5000);
startWebsocketServer(gameManager);
connectToDiscord(new CommandHandler(summonerCache, messageEngine, gameManager));