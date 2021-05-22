import { GameEvent } from './GameEvent';
import { DiscordBot } from './DiscordBot';

export class CharmGame {
    type: 'charm';
    private charmCast: number = 0;
    private charmHit: number = 0;

    public get summoner() {
        return this.summonerName;
    }

    constructor(private summonerName: string, private discordBot: DiscordBot) {
        this.discordBot.sendMessage(`Tracking your charms ${discordBot.getMentionOrNot(summonerName)} :fox: :heart:`);

    }

    public processExistingEvents(events: GameEvent[]) {
        events.forEach(e => this.onEvent(e, false));
    }

    public onEvent(event: GameEvent, announce: boolean) {
        if (event.EventName === 'CharmCast') {
            if (announce) this.discordBot.sendMessage(':eyes:');
            this.charmCast++;
        } else if (event.EventName === 'CharmHit') {
            if (announce) this.discordBot.sendMessage(':heart:');
            this.charmHit++;
        }
    }

    public onGameOver() {
        this.discordBot.sendMessage(`Charm tracking for ${this.discordBot.getMentionOrNot(this.summonerName)} ended with ${this.charmHit}/${this.charmCast}`);
    }
}