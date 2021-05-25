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
    constructor(protected context: MiniGameContext) { }
    abstract startGame(events: GameEvent[]);
    abstract onEvent(event: GameEvent, announce: boolean);
    abstract onGameOver();
    abstract equals(miniGame: MiniGame): boolean;

    protected get textChannel() { return this.context.textChannel; }
    protected get summonerCache() { return this.context.summonerCache; }
    protected get messageEngine() { return this.context.messageEngine; }

}