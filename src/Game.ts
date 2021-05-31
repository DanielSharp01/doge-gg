import { Player } from './Player';
import { GameEvent } from './GameEvent';
import { GameClientMessage } from './GameClientMessage';
import { MiniGame } from './MiniGame';

export class Game {
    private events: Array<GameEvent> = [];
    private _players: Array<Player>;
    public miniGames: Array<MiniGame> = [];
    private _clientUuids = new Set<string>();
    private _lastHadClients = 0;

    public get players() {
        return this._players;
    }

    constructor(players: Player[]) {
        this._players = players.sort((a, b) => a.summonerName.localeCompare(b.summonerName));
        this.events = [];
    }

    public startMiniGame(miniGame: MiniGame): boolean {
        const existing = this.miniGames.find(g => g.equals(miniGame))
        if (!existing) {
            this.miniGames.push(miniGame);
            miniGame.startGame(this.events);
            return true;
        } else if (!existing.textChannel) {
            existing.setTextChannel(miniGame.textChannel);
        }
        return false;
    }

    private onEvent(event: GameEvent) {
        if (this.events.some(e => this.eventsEssentiallyEqual(event, e))) return;
        if (event.EventName === 'GameEnd') {
            this.onGameOver();
            return;
        }
        this.events.push(event);
        this.miniGames.forEach(b => b.onEvent(event, true));
    }

    onGameOver() {
        this.miniGames.forEach(b => b.onGameOver());
        this.miniGames = [];
    }

    onMessage(message: GameClientMessage) {
        if (message.type == 'gotEvents') {
            message.events.forEach(e => this.onEvent(e));
        }
    }

    equals(other: Game) {
        for (const i in this.players) {
            if (this.players.map(a => a.summonerName)[i] != other.players.map(a => a.summonerName)[i]) return false;
        }

        return true;
    }

    eventsEssentiallyEqual(a: GameEvent, b: GameEvent) {
        return a.EventName == b.EventName && a.EventTime == b.EventTime;
    }

    addClient(uuid: string) {
        this._clientUuids.add(uuid);
        this._lastHadClients = Date.now();
    }

    removeClient(uuid: string) {
        if (this._clientUuids.size == 0) return;
        this._clientUuids.delete(uuid);
        this._lastHadClients = Date.now();
    }

    get hasClients() {
        return this._clientUuids.size > 0;
    }

    get lastHadClients() {
        return this._lastHadClients;
    }
}