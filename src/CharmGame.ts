import { GameEvent } from './GameEvent';
import { MiniGame, MiniGameContext } from './MiniGame';

export class CharmGame extends MiniGame {
    private charmCast: number = 0;
    private charmHit: number = 0;

    public get summoner() {
        return this.summonerName;
    }

    constructor(context: MiniGameContext, private summonerName: string) {
        super(context);
        this.textChannel.send(`Tracking your charms ${this.summonerCache.getMentionOrNot(summonerName)} :fox: :heart:`);
    }

    public startGame(events: GameEvent[]) {
        this.textChannel.send(`Tracking your charms ${this.summonerCache.getMentionOrNot(this.summonerName)} :fox: :heart:`);
        events.forEach(e => this.onEvent(e, false));
    }

    public onEvent(event: GameEvent, announce: boolean) {
        if (event.EventName === 'CharmCast') {
            this.charmCast++;
        } else if (event.EventName === 'CharmHit') {
            this.charmHit++;
        }
    }

    public onGameOver() {
        this.textChannel.send(`Charm tracking for ${this.summonerCache.getMentionOrNot(this.summonerName)} ended with ${this.charmHit}/${this.charmCast}`);
    }

    equals(other: MiniGame): boolean {
        if (!(other instanceof CharmGame)) return false;
        const otherGame = other as CharmGame;
        return otherGame.summonerName == this.summonerName;
    }
}