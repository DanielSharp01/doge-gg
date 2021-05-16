import { Client, TextChannel, Message, MessageOptions } from 'discord.js';
import fs from 'fs';
import { PlayerWithScore } from "./PlayerWithScore";
import AsciiTable from 'ascii-table';
import { MessageEngine } from './MessageEngine';
import { Game } from './Game';

export class DiscordBot {
  private summoners: { [key: string]: string } = {};
  private client = new Client();
  private currentChannel?: TextChannel = null;
  public messageEngine: MessageEngine;
  private game: Game;

  constructor() {
    if (fs.existsSync('./summoners.json')) {
      this.summoners = JSON.parse(fs.readFileSync('./summoners.json', { encoding: 'utf8' }));
    } else {
      this.saveSummoners();
    }
    this.game = new Game();
    this.messageEngine = new MessageEngine(this);
    this.client.on('message', (message) => this.onMessage(message));

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

  hasMention(summonerName: string): boolean {
    return !!this.getDiscordId(summonerName);
  }

  getMentionOrNot(summonerName: string): string {
    const discordId = this.getDiscordId(summonerName);
    return discordId ? `<@${discordId}>` : summonerName;
  }

  printScoreTable(scores: Array<PlayerWithScore>) {
    const sortedScores = [...scores];
    sortedScores.sort((a, b) => b.score - a.score);
    const table = new AsciiTable()
    table.setHeading('Place', 'Name', 'Score', 'Kills', 'Deaths');
    sortedScores.forEach((s, i) => table.addRow(i + 1, s.summonerName, s.score, s.kills, s.deaths));
    this.sendMessage(table.toString(), { code: true });
  }

  onMessage(message: Message) {
    if (message.author.bot) return;
    if (!(message.channel as TextChannel)?.permissionsFor(this.client.user)?.has("SEND_MESSAGES")) return;
    if (message.content.startsWith('!gg')) {
      this.commandHandler(message);
    }
  }

  async commandHandler(message: Message) {
    this.setActiveChannel(message.channel as TextChannel);
    const command = message.content.slice('!gg '.length);
    if (command.startsWith('me ')) {
      const summoner = command.slice('me '.length);
      this.recievedSummonerName(message.author.id, summoner);
      this.messageEngine.recieveSummonerMessage(message, summoner);
    } else if (command.startsWith('bounty ')) {
      const summoner = this.getSummoner(message.author.id);
      if (!summoner) {
        this.sendMessage(`I don't know you <@${message.author.id}>. Please use the !gg me <summoner name> command`);
        return;
      }
      const game = await this.game.awaitGame(summoner);
      if (game) {
        const champion = command.slice('bounty '.length);
        if (!game.startBountyGame(this, summoner, this.messageEngine.unaliasChampion(champion))) {
          this.sendMessage(`<@${message.author.id}> :x: Could not set bounty on ${champion} as they are not in the enemy :rolling_eyes:`);
          return;
        }
      }
      else this.sendMessage(`<@${message.author.id}> :x: Could not set bounty the game is not even running (at least not for the bot host) :rolling_eyes:`);
    } else if (command.startsWith('message')) {
      try {
        const listing = (arr: Array<string>) => {
          if (!arr || arr.length === 0) return this.sendMessage('Nothing', { code: true });
          this.sendMessage(arr.map((e, i) => `${i}. ${e}`).join('\n'), { split: true, code: true });
        }

        const [groupKey, action, ...remArr] = command.slice('message'.length).trim().split(' ');
        const remaining = remArr.join(' ');

        if (!groupKey) throw new Error("No groupKey");

        if (groupKey === 'print') {
          this.sendMessage(this.messageEngine.getData(), { code: 'json', split: true });
        } else if (groupKey === 'reload') {
          this.messageEngine.loadData();
        } else if (action === 'list') {
          const key = remaining.trim();
          if (!key) throw new Error("No key");
          listing(this.messageEngine.listMessages(groupKey, remaining.trim()));
        } else if (action === 'add') {
          const match = remaining.match(/>/);
          if (match) {
            const key = remaining.slice(0, match.index).trim();
            if (!key) throw new Error("No key");
            const message = remaining.slice(match.index + 1).trim();
            if (!message) throw new Error("No message");
            this.messageEngine.addMessage(groupKey, key, message);
          } else {
            throw new Error("No >");
          }
        } else if (action === 'edit') {
          const match = remaining.match(/\[(\d+)\]/);
          if (match) {
            const key = remaining.slice(0, match.index).trim();
            if (!key) throw new Error("No key");
            const index = parseInt(match[1]);
            if (isNaN(index)) throw new Error("NaN index");
            const end = remaining.slice(match.index + match[0].length).trim();
            if (!end.startsWith(">")) throw new Error("No >");
            const message = end.slice(1).trim();
            if (!message) throw new Error("No message");
            this.messageEngine.editMessage(groupKey, key, index, message);
          } else {
            throw new Error("No index");
          }
        } else if (action === 'remove') {
          const match = remaining.match(/\[(\d+)\]/);
          if (match) {
            const key = remaining.slice(0, match.index).trim();
            if (!key) throw new Error("No key");
            const index = parseInt(match[1]);
            if (isNaN(index)) throw new Error("NaN index");
            this.messageEngine.removeMessage(groupKey, key, index);
          } else {
            throw new Error("No index");
          }
        } else if (!action) {
          throw new Error(`No action`);
        } else {
          throw new Error(`Unknown action ${action}`);
        }
        message.react('👍');
      } catch (error) {
        message.reply(error.message);
        message.react('❌');
      }
    }
  }

  setActiveChannel(channel: TextChannel) {
    this.currentChannel = channel;
  }

  sendMessage(message: string, options?: MessageOptions) {
    try {
      this.currentChannel?.send(message, options);
    } catch (err) { }
  }
}