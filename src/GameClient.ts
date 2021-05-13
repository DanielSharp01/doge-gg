import fetch from 'node-fetch';
import { Event } from './Event';
import { Player } from './Player';
import { sleep } from './sleep';

export class GameClient {
  private lastEventId = -1;
  private _players: Array<Player>;
  private events: Array<Event> = [];

  constructor(private gameOverCallback: () => void) {
  }

  async awaitGameStart(): Promise<Array<Player>> {
    while (true) {
      try {
        const res = await fetch('https://127.0.0.1:2999/liveclientdata/playerlist').then(res => res.json());
        if (res[0] && res[0].summonerName) return this._players = res;
      } catch (err) {
      }
      await sleep(1000);
    }
  }

  private async requestEvents(): Promise<Array<any>> {
    const events = (await fetch(`https://127.0.0.1:2999/liveclientdata/eventdata?eventID=${this.lastEventId + 1}`).then(res => res.json()).then(res => res.Events)) ?? [];
    if (events.length > 0) this.lastEventId = events[events.length - 1].EventID;
    return events;
  }

  async processEvents(eventCallback: (e: Event) => void) {
    while (true) {
      try {
        (await this.requestEvents()).forEach(e => {
          this.events.push(e);
          eventCallback(e);
        });
      } catch (err) {
        this.gameOver();

        return;
      }
      await sleep(500);
    }
  }

  replayEvents(eventCallback: (event: Event) => void) {
    this.events.forEach(e => eventCallback(e));
  }

  gameOver() {
    this._players = null;
    this.gameOverCallback();
  }

  get isRunning(): boolean {
    return !!this._players;
  }

  get players(): Array<Player> {
    return this._players && [...this._players];
  }
}