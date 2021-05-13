import { Announcement, ChampionTracker, TrackedChampion } from './ChampionTracker';
import { GameClient } from './GameClient';
import { config } from 'dotenv';
import { DiscordBot } from './DiscordBot';
import { Message, TextChannel } from 'discord.js';
import { bountyErrorNoChampMessage, bountyErrorNoGameMessage, deathMessage, killMessage, setOutBountyMessage, summonerSuccessfulMessage, winnerMessage } from './messages';

config();

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

(async () => {
  let discordBot: DiscordBot;
  let championTracker: ChampionTracker = new ChampionTracker((announcement: Announcement) => {
    discordBot.sendMessage(killMessage(discordBot.getMentionOrNot(announcement.allySummonerName), announcement.enemyChampionName));
  }, (announcement: Announcement) => {
    discordBot.sendMessage(deathMessage(discordBot.getMentionOrNot(announcement.allySummonerName), announcement.enemyChampionName));
  });
  const gameClient = new GameClient(() => {
    if (championTracker.isTracking) {
      const scores = championTracker.getScores();
      discordBot.printScoreTable(scores);
      const maxScore = Math.max(...scores.map(p => p.score));
      const winners = scores.filter(p => p.score === maxScore).map(p => discordBot.getMentionOrNot(p.summonerName));
      discordBot.sendMessage(winnerMessage(winners, maxScore));
      championTracker.finishTracking();
    }
  });
  discordBot = new DiscordBot((message: Message) => {
    discordBot.setActiveChannel(message.channel as TextChannel);
    if (message.content.toLowerCase().startsWith('!gg me ')) {
      const summonerName = message.content.slice('!gg me '.length).trim();
      discordBot.recievedSummonerName(message.author.id, summonerName);
      message.reply(summonerSuccessfulMessage(summonerName));
    }
    else if (message.content.toLowerCase().startsWith('!gg bounty ')) {
      const championName = message.content.slice('!gg bounty '.length).trim();
      if (!gameClient.isRunning) {
        return message.reply(bountyErrorNoGameMessage());
      }
      else if (championTracker.setupTracking(discordBot.getSummoner(message.author.id), championName, gameClient)) {
        message.reply(setOutBountyMessage(championName));
        const scores = championTracker.getScores();
        if (scores.map(p => p.kills > 0 || p.deaths > 0)) {
          discordBot.sendMessage('This game was already running, here are the scores so far:');
          discordBot.printScoreTable(scores);
        }
      }
      else {
        message.reply(bountyErrorNoChampMessage(championName));
      }
    }
  });
  await discordBot.awaitReady();
  while (true) {
    await gameClient.awaitGameStart();
    await gameClient.processEvents(e => championTracker.onEvent(e));
  }
})();