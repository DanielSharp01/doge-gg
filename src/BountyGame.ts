import { PlayerWithScore } from "./PlayerWithScore";
import { Player } from './Player';
import AsciiTable from 'ascii-table';
import { GameEvent } from './GameEvent';
import { MiniGame, MiniGameContext } from './MiniGame';
import { BountyGameResult } from './db/BountyGameResult';

export class BountyGame extends MiniGame {
    private _allies: Array<PlayerWithScore>;
    public constructor(context: MiniGameContext, allies: Array<Player>, private poster: Player, public enemy: Player) {
        super(context);
        this._allies = allies.map(a => ({ ...a, score: 0, kills: 0, deaths: 0 }));
    }

    public get allies() {
        return this._allies.slice();
    }

    public startGame(events: GameEvent[]) {
        this.messageEngine.useChannel(this.textChannel).bountyMessage(this.poster, this.enemy);
        events.forEach(e => this.onEvent(e, false));
        if (this._allies.some(a => a.score > 0 || a.kills > 0 || a.deaths > 0)) {
            this.textChannel.send('This game is already running. Here are the scores so far:')
            this.printScoreTable();
        }
    }

    printScoreTable() {
        const sortedScores = [...this._allies];
        sortedScores.sort((a, b) => b.score - a.score);
        const table = new AsciiTable(`${this.enemy.championName}'s bounty`);
        table.setHeading('Place', 'Name', 'Score', 'Kills', 'Deaths');
        sortedScores.forEach((s, i) => table.addRow(i + 1, s.summonerName, s.score, s.kills, s.deaths));
        this.textChannel.send(table.toString(), { code: true });
    }

    public onEvent(event: GameEvent, announce: boolean) {
        if (event.EventName !== 'ChampionKill') return;
        let ally: PlayerWithScore;
        if (this.enemy.summonerName === event.VictimName && (ally = this._allies.find(a => a.summonerName === event.KillerName))) {
            ally.score++;
            ally.kills++;
            if (announce) this.messageEngine.useChannel(this.textChannel).killMessage(ally, this.enemy);
        }
        if (this.enemy.summonerName === event.KillerName && (ally = this._allies.find(a => a.summonerName === event.VictimName))) {
            ally.score--;
            ally.deaths++;
            if (announce) this.messageEngine.useChannel(this.textChannel).deathMessage(this.enemy, ally);
        }
    }

    public onGameOver() {
        this.printScoreTable();
        const maxScore = Math.max(...this._allies.map(p => p.score));
        const winners = this._allies.filter(p => p.score === maxScore);
        this.messageEngine.useChannel(this.textChannel).gameOverMessage(winners);
        new BountyGameResult({ enemyChampion: this.enemy.championName, startDate: new Date(this.timestamp), players: this._allies }).save().then();
    }

    equals(other: MiniGame): boolean {
        if (other.textChannel != this.textChannel) return false;
        if (!(other instanceof BountyGame)) return false;
        const otherGame = other as BountyGame;
        if (!otherGame._allies.find(a => a.summonerName == this._allies[0].summonerName)) return false;
        return otherGame.enemy.summonerName == this.enemy.summonerName;
    }
}