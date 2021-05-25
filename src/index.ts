import { config } from 'dotenv';
import { CommandHandler } from './CommandHandler';
import { connectToDiscord } from './DiscordBot';
import { GameManager } from './GameManager';
import { MessageEngine } from './MessageEngine';
import { startWebsocketServer } from './WebsocketServer';
import { SummonerCache } from './SummonerCache';
import { ChampionCache } from './ChampionCache';

config();

const championCache = new ChampionCache();
championCache.requestOrLoadData().then(() => {
    const summonerCache = new SummonerCache();
    const messageEngine = new MessageEngine(summonerCache);
    const gameManager = new GameManager(messageEngine, summonerCache)
    setInterval(() => gameManager.cleanupGames(), 5000);
    startWebsocketServer(gameManager);
    connectToDiscord(new CommandHandler(summonerCache, championCache, messageEngine, gameManager));
});