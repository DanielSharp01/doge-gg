import fetch from 'node-fetch';
import { sleep } from './sleep';
import { Player } from './Player';
import { GameEvent } from './GameEvent';
import { BountyGame } from './BountyGame';
import { DiscordBot } from './DiscordBot';
import { wsr } from './MessageEngine';

export class Game {
    private lastEventId: number = -1;
    private events: Array<GameEvent> = [];
    private _players: Array<Player>;
    private bountyGames: Array<BountyGame> = [];
    private gameReadyPromise: Promise<void>;
    private _activePlayer: string;

    public get players() {
        return this._players;
    }

    public get activePlayer() {
        return this._activePlayer;
    }

    constructor() {
        this.gameReadyPromise = this.awaitGameStart().then(() => {
            this.processEvents();
        });
    }

    async awaitGame(summoner: string): Promise<Game> {
        return Promise.race([this.gameReadyPromise.then(() => this._players.find(p => p.summonerName === summoner) ? this : null), sleep(30000).then(() => null)]);
    }

    startBountyGame(discordBot: DiscordBot, summoner: string, champion: string): boolean {
        if (this.bountyGames.some(b => wsr(b.enemy.championName) === wsr(champion))) return true;
        const poster = this._players.find(p => p.summonerName === summoner);
        const team = poster.team;
        const allies = this._players.filter(p => p.team === team);
        const enemies = this._players.filter(p => p.team !== team);
        const enemy = enemies.find(e => wsr(e.championName) === wsr(champion));
        if (enemy) {
            this.bountyGames.push(new BountyGame(allies, this.events, poster, enemy, discordBot));
        }
        return !!enemy;
    }

    onEvent(event: GameEvent) {
        if (event.EventName === 'GameEnd') {
            this.onGameOver();
        }
        this.events.push(event);
        this.bountyGames.forEach(b => b.onEvent(event, true));
    }

    onGameOver() {
        this.bountyGames.forEach(b => b.onGameOver());
        this.bountyGames = [];
    }

    async awaitGameStart(): Promise<Array<Player>> {
        while (true) {
            try {
                const res = await fetch('https://127.0.0.1:2999/liveclientdata/playerlist').then(res => res.json());
                if (res[0] && res[0].summonerName) {
                    this.events = [];
                    this.lastEventId = -1;
                    this._activePlayer = await fetch('https://127.0.0.1:2999/liveclientdata/activeplayername').then(res => res.json())
                    this._players = res;
                    return res;
                }
            } catch (err) {
            }
            await sleep(1000);
        }
    }

    private async requestEvents(): Promise<Array<GameEvent>> {
        const events = (await fetch(`https://127.0.0.1:2999/liveclientdata/eventdata?eventID=${this.lastEventId + 1}`).then(res => res.json()).then(res => res.Events)) ?? [];
        if (events.length > 0) this.lastEventId = events[events.length - 1].EventID;
        return events;
    }

    async processEvents() {
        while (true) {
            try {
                (await this.requestEvents()).forEach(e => {
                    this.onEvent(e);
                });
            } catch (err) {
                this.onGameOver();
                this.gameReadyPromise = this.awaitGameStart().then(() => {
                    this.processEvents();
                });
                return;
            }
            await sleep(500);
        }
    }
}