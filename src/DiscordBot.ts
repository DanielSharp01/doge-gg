import { Client } from 'discord.js';
import { CommandHandler } from './CommandHandler';

export function connectToDiscord(commandHandler: CommandHandler) {
  const client = new Client();
  client.on('ready', () => console.log(`Discord bot started`));
  client.on('message', (message) => commandHandler.recievedMessage(message));
  client.login(process.env.DISCORD_BOT_TOKEN);
}

/*async commandHandler(message: Message) {
  this.setActiveChannel(message.channel as TextChannel);
  const command = message.content.slice('!gg '.length);
  if (command.startsWith('me ')) {
    const summoner = command.slice('me '.length);
    this.recievedSummonerName(message.author.id, summoner);
    this.messageEngine.recieveSummonerMessage(message, summoner);
  } else if (command.startsWith('bounty ')) {
    const summoner = this.getSummoner(message.author.id);
    if (!summoner) {
      this.sendMessage(`I don't know you <@${message.author.id}>. Please use the \`!gg me <summoner name>\` command`);
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
  } else if (command.startsWith('charm')) {
    const summoner = this.getSummoner(message.author.id);
    if (!summoner) {
      this.sendMessage(`I don't know you <@${message.author.id}>. Please use the \`!gg me <summoner name>\` command`);
      return;
    }
    const game = await this.game.awaitGame(summoner);
    if (game) {
      if (!game.startCharmGame(this, summoner)) {
        this.sendMessage(`<@${message.author.id}> :x: Could not  track charms ${this.getMentionOrNot(game.activePlayer)} is not playing Ahri :frown:`);
        return;
      }
    }
    else this.sendMessage(`<@${message.author.id}> :x: Could not track charms the game is not even running (at least not for the bot host) :rolling_eyes:`);
  }
}*/