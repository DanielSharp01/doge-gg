import { Client, TextChannel, Message } from 'discord.js';
import fs from 'fs';
import { PlayerWithScore } from './ChampionTracker';
import AsciiTable from 'ascii-table';

export class DiscordBot {
  private summoners: { [key: string]: string } = {};
  private client = new Client();
  private currentChannel?: TextChannel = null;
  private readyPromise: Promise<boolean>;
  private readyResolve: (r?) => void;

  constructor(private commandHandler: (message: Message) => void) {
    if (fs.existsSync('./summoners.json')) {
      this.summoners = JSON.parse(fs.readFileSync('./summoners.json', { encoding: 'utf8' }));
    } else {
      this.saveSummoners();
    }

    this.client.on('ready', () => this.onReady());
    this.client.on('message', (message) => this.onMessage(message));

    this.readyPromise = new Promise(resolve => {
      this.readyResolve = resolve;
    })
    this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  recievedSummonerName(discordId: string, summonerName: string) {
    this.summoners[discordId] = summonerName;
    this.saveSummoners();
  }

  saveSummoners() {
    fs.writeFileSync('./summoners.json', JSON.stringify(this.summoners, null, 2), { encoding: 'utf8' });
  }

  getSummoner(id: string): string {
    return this.summoners[id];
  }

  getDiscordId(summonerName: string): string {
    return Object.keys(this.summoners).find(id => this.summoners[id] === summonerName);
  }

  getMentionOrNot(summonerName: string): string {
    const discordId = this.getDiscordId(summonerName);
    return discordId ? `<@${discordId}>` : summonerName;
  }

  printScoreTable(scores: Array<PlayerWithScore>) {
    const sortedScores = [...scores];
    sortedScores.sort();
    const table = new AsciiTable('A Title')
    table.setHeading('Place', 'Name', 'Score', 'Kills', 'Deaths');
    scores.forEach((s, i) => table.addRow(i + 1, s.summonerName, s.score, s.kills, s.deaths));
    this.sendMessage(table.toString());
  }

  async awaitReady() {
    return this.readyPromise;
  }

  onReady() {
    if (this.readyResolve) this.readyResolve();
  }

  onMessage(message: Message) {
    if (message.author.bot) return;
    this.commandHandler(message);
  }

  setActiveChannel(channel: TextChannel) {
    this.currentChannel = channel;
  }

  sendMessage(message: string) {
    this.currentChannel?.send(message);
  }
}