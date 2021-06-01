import { GameEvent } from './GameEvent';
import { TextChannel } from 'discord.js';
import { MessageEngine } from './MessageEngine';
import { SummonerCache } from './SummonerCache';

export interface MiniGameContext {
    textChannel: TextChannel;
    summonerCache: SummonerCache;
    messageEngine: MessageEngine;
}

export abstract class MiniGame {
    private _timestamp: number;
    constructor(protected context: MiniGameContext) {
        this._timestamp = new Date().getTime();
    }
    abstract startGame(events: GameEvent[]);
    setTextChannel(textChannel: TextChannel) { }
    abstract onEvent(event: GameEvent, announce: boolean);
    abstract onGameOver();
    abstract equals(miniGame: MiniGame): boolean;

    public get textChannel() { return this.context.textChannel; }
    protected get summonerCache() { return this.context.summonerCache; }
    protected get messageEngine() { return this.context.messageEngine; }
    public get timestamp() { return this._timestamp; }
}