import { GameEvent } from './GameEvent';
import { MiniGame, MiniGameContext } from './MiniGame';
import { CharmGameResult } from './db/CharmGameResult';
import { TextChannel } from 'discord.js';

export class CharmGame extends MiniGame {
    private _charmCast: number = 0;
    private _charmHit: number = 0;

    public get summoner() {
        return this.summonerName;
    }

    public get charmCast() {
        return this._charmCast;
    }

    public get charmHit() {
        return this._charmHit;
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
            this._charmCast++;
        } else if (event.EventName === 'CharmHit') {
            this._charmHit++;
        }
    }

    public onGameOver() {
        this.textChannel?.send(`${this.summonerCache.getMentionOrNot(this.summonerName)}'s charm stats for this game ${this._charmHit}/${this._charmCast} (${this._charmCast && Math.round(this._charmHit / this._charmCast * 10000) / 100})`);
        if (this._charmCast > 0) new CharmGameResult({ summoner: this.summonerName, charmCast: this._charmCast, charmHit: this._charmHit }).save().then();
    }

    equals(other: MiniGame): boolean {
        if (!(other instanceof CharmGame)) return false;
        const otherGame = other as CharmGame;
        return otherGame.summonerName == this.summonerName;
    }
}