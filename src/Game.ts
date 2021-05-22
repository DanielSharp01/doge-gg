import fetch from 'node-fetch';
import { sleep } from './sleep';
import { Player } from './Player';
import { GameEvent } from './GameEvent';
import { BountyGame } from './BountyGame';
import { DiscordBot } from './DiscordBot';
import { wsr } from './MessageEngine';
import { CharmGame } from './CharmGame';
import { GameClientMessage } from './GameClientMessage';
import { MiniGame } from './MiniGame';

export class Game {
    private events: Array<GameEvent> = [];
    private _players: Array<Player>;
    private miniGames: Array<MiniGame> = [];
    private gameReadyPromise: Promise<void>;
    private gameReadyResolve: () => void;
    private _activePlayer: string;

    public get players() {
        return this._players;
    }

    public get activePlayer() {
        return this._activePlayer;
    }

    constructor() {
        this.gameReadyPromise = new Promise(resolve => this.gameReadyResolve = resolve);
    }

    async awaitGame(summoner: string): Promise<Game> {
        return Promise.race([this.gameReadyPromise.then(() => this._players.find(p => p.summonerName === summoner) ? this : null), sleep(30000).then(() => null)]);
    }

    startBountyGame(discordBot: DiscordBot, summoner: string, champOrSkin: string): boolean {
        if (this.miniGames.some(b => b.type === 'bounty' && (wsr(b.enemy.championName) === wsr(champOrSkin) || wsr(b.enemy.skinName) === wsr(champOrSkin)))) return true;
        const poster = this._players.find(p => p.summonerName === summoner);
        const team = poster.team;
        const allies = this._players.filter(p => p.team === team);
        const enemies = this._players.filter(p => p.team !== team);
        const enemy = enemies.find(e => wsr(e.championName) === wsr(champOrSkin) || wsr(e.skinName) === wsr(champOrSkin));
        if (enemy) {
            this.startMiniGame(new BountyGame(discordBot, allies, poster, enemy));
        }
        return !!enemy;
    }

    onGameStarted(players: Player[], activePlayerName: string) {
        this._players = players;
        this._activePlayer = activePlayerName;
        this.events = [];
        this.gameReadyResolve();
    }

    startCharmGame(discordBot: DiscordBot, summoner: string) {
        if (this.players.find(p => p.summonerName === this.activePlayer).championName === 'Ahri') {
            if (this.miniGames.some(b => b.type == 'charm' && b.summoner == summoner)) return true;
            this.startMiniGame(new CharmGame(summoner, discordBot));
            return true;
        }
        return false;
    }

    private startMiniGame(miniGame: MiniGame) {
        this.miniGames.push(miniGame);
        miniGame.processExistingEvents(this.events);
    }

    private onEvent(event: GameEvent) {
        if (event.EventName === 'GameEnd') {
            this.onGameOver();
            return;
        }
        this.events.push(event);
        this.miniGames.forEach(b => b.onEvent(event, true));
    }

    private onGameOver() {
        this.miniGames.forEach(b => b.onGameOver());
        this.miniGames = [];
    }

    onMessage(message: GameClientMessage) {
        if (message.type == 'clientConnected') {
            this.onGameStarted(message.players, message.activePlayerName);
        } else if (message.type == 'clientDisconnected') {
            this.onGameOver();
        } else if (message.type == 'gotEvents') {
            message.events.forEach(e => this.onEvent(e));
        }
    }
}