import { PlayerWithScore } from "./PlayerWithScore";
import { Player } from './Player';
import { DiscordBot } from './DiscordBot';
import { GameEvent } from './GameEvent';

export class BountyGame {
    private allies: Array<PlayerWithScore>;
    public constructor(allies: Array<Player>, events: Array<GameEvent>, poster: Player, public enemy: Player, private discordBot: DiscordBot) {
        this.allies = allies.map(a => ({ ...a, score: 0, kills: 0, deaths: 0 }));
        events.forEach(e => this.onEvent(e, false));
        this.discordBot.messageEngine.bountyMessage(poster, enemy);
        if (this.allies.some(a => a.score > 0 || a.kills > 0 || a.deaths > 0)) {
            this.discordBot.sendMessage('This game is already running. Here are the scores so far:')
            this.discordBot.printScoreTable(this.allies);
        }
    }

    public onEvent(event: GameEvent, announce: boolean) {
        if (event.EventName !== 'ChampionKill') return;
        let ally: PlayerWithScore;
        if (this.enemy.summonerName === event.VictimName && (ally = this.allies.find(a => a.summonerName === event.KillerName))) {
            ally.score++;
            ally.kills++;
            if (announce) this.discordBot.messageEngine.killMessage(ally, this.enemy);
        }
        if (this.enemy.summonerName === event.KillerName && (ally = this.allies.find(a => a.summonerName === event.VictimName))) {
            ally.score--;
            ally.deaths++;
            if (announce) this.discordBot.messageEngine.deathMessage(this.enemy, ally);
        }
    }

    public onGameOver() {
        this.discordBot.printScoreTable(this.allies);
        const maxScore = Math.max(...this.allies.map(p => p.score));
        const winners = this.allies.filter(p => p.score === maxScore);
        this.discordBot.messageEngine.gameOverMessage(winners);
    }
}