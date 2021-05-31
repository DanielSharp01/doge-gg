import { GameEvent } from './GameEvent';
import { MiniGame, MiniGameContext } from './MiniGame';
import { CharmGameResult } from './db/CharmGameResult';
import { TextChannel } from 'discord.js';

export class CharmGame extends MiniGame {
    private charmCast: number = 0;
    private charmHit: number = 0;

    public get summoner() {
        return this.summonerName;
    }

    constructor(context: MiniGameContext, private summonerName: string) {
        super(context);
    }

    public startGame(events: GameEvent[]) {
        this.textChannel?.send(`Tracking your charms ${this.summonerCache.getMentionOrNot(this.summonerName)} :fox: :heart:`);
        events.forEach(e => this.onEvent(e, false));
    }

    public setTextChannel(textChannel: TextChannel) {
        this.context.textChannel = textChannel;
        this.textChannel?.send(`Tracking your charms ${this.summonerCache.getMentionOrNot(this.summonerName)} :fox: :heart:`);
    }

    public onEvent(event: GameEvent, announce: boolean) {
        if (event.EventName === 'CharmCast') {
            this.charmCast++;
        } else if (event.EventName === 'CharmHit') {
            this.charmHit++;
        }
    }

    public onGameOver() {
        this.textChannel?.send(`${this.summonerCache.getMentionOrNot(this.summonerName)}'s charm stats for this game ${this.charmHit}/${this.charmCast} (${this.charmCast && Math.round(this.charmHit / this.charmCast * 10000) / 100})`);
        if (this.charmCast > 0) new CharmGameResult({ summoner: this.summonerName, charmCast: this.charmCast, charmHit: this.charmHit }).save().then();
    }

    equals(other: MiniGame): boolean {
        if (other.textChannel != this.textChannel) return false;
        if (!(other instanceof CharmGame)) return false;
        const otherGame = other as CharmGame;
        return otherGame.summonerName == this.summonerName;
    }
}