
type EventTypes = 'ChampionKill' | 'CharmCast' | 'CharmHit' | 'GameStart' | 'GameEnd';

export type GameEvent = KillEvent | GameEventBase<'CharmCast'> | CharmHitEvent | GameEventBase<'GameStart'> | GameEventBase<'GameEnd'>;
interface GameEventBase<T extends EventTypes> {
  EventName: T;
  EventTime: number;
}

interface KillEvent extends GameEventBase<'ChampionKill'> {
  KillerName: string;
  VictimName: string;
}

interface CharmHitEvent extends GameEventBase<'CharmHit'> {
  CharmerName: string;
  CharmeeName: string;
}