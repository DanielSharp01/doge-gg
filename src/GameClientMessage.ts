import { GameEvent } from './GameEvent';
import { Player } from './Player';

type GameClientMessageTypes = 'connect' | 'clientConnected' | 'clientDisconnected' | 'gotEvents';
export type GameClientMessage = ClientConnectedMessage | GotEventsMessage | GameClientMessageBase<'connect'> | GameClientMessageBase<'clientDisconnected'>;

interface GameClientMessageBase<T extends GameClientMessageTypes> {
    type: T;
    uuid: string;
}

interface ClientConnectedMessage extends GameClientMessageBase<'clientConnected'> {
    players: Player[];
    activePlayerName: string;
}

interface GotEventsMessage extends GameClientMessageBase<'gotEvents'> {
    events: GameEvent[];
}