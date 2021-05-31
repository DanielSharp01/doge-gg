import { config } from 'dotenv';
import { CommandHandler } from './CommandHandler';
import { connectToDiscord } from './DiscordBot';
import { GameManager } from './GameManager';
import { MessageEngine } from './MessageEngine';
import { startWebsocketServer } from './WebsocketServer';
import { SummonerCache } from './SummonerCache';
import { ChampionCache } from './ChampionCache';
import mongoose from 'mongoose';
import { BountyGameResult } from './db/BountyGameResult';
import { CharmGameResult } from './db/CharmGameResult';

config();
const championCache = new ChampionCache();
championCache.requestOrLoadData().then(async () => {
    await mongoose.connect(process.env.MONGOCONN.replace("<DB>", "doge-gg"), {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    });
    const summonerCache = new SummonerCache();
    const messageEngine = new MessageEngine(summonerCache);
    const gameManager = new GameManager(messageEngine, summonerCache)
    setInterval(() => gameManager.cleanupGames(), 5000);
    startWebsocketServer(gameManager);
    connectToDiscord(new CommandHandler(summonerCache, championCache, messageEngine, gameManager));
});