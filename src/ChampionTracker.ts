import { Event } from './Event';
import { Player } from './Player';
import { GameClient } from './GameClient';

export interface TrackedChampion {
  trackerSummonerName: string;
  trackedSummonerName: string;
  trackedChampionName: string;
  trackedTeam: string;
}

export interface Announcement {
  allySummonerName: string;
  enemySummonerName: string;
  enemyChampionName: string;
  newAllyScore: number;
}

export interface PlayerWithScore extends Player {
  score: number;
  deaths: number;
  kills: number;
}

export class ChampionTracker {
  private trackedChampion?: TrackedChampion = null;
  private allies: Array<PlayerWithScore>;

  constructor(
    private killAnnouncement: (champion: Announcement) => void,
    private deathAnnouncement: (champion: Announcement) => void,
  ) {
  }

  setupTracking(trackerName: string, trackedChampionName: string, gameClient: GameClient): TrackedChampion {
    const tracker = gameClient.players.find(p => p.summonerName === trackerName);
    this.allies = gameClient.players.filter(p => p.team === tracker.team).map(p => ({ ...p, score: 0, kills: 0, deaths: 0 }));
    if (!tracker) return null;
    const tracked = gameClient.players.find(p => p.championName === trackedChampionName && p.team !== tracker.team);
    if (!tracked) return null;
    this.trackedChampion = {
      trackedSummonerName: tracked.summonerName,
      trackedChampionName,
      trackedTeam: tracked.team,
      trackerSummonerName: tracker.summonerName,
    };
    gameClient.replayEvents(event => this.onEvent(event, false))
    return this.trackedChampion;
  }

  onEvent(event: Event, announce = true) {
    if (!this.trackedChampion) return;
    if (event.EventName !== 'ChampionKill') return;
    let ally: PlayerWithScore;
    if (this.trackedChampion.trackedSummonerName === event.VictimName && (ally = this.allies.find(a => a.summonerName === event.KillerName))) {
      ally.score++;
      ally.kills++;
      if (announce) this.killAnnouncement({
        allySummonerName: event.KillerName,
        enemySummonerName: this.trackedChampion.trackedSummonerName,
        enemyChampionName: this.trackedChampion.trackedChampionName,
        newAllyScore: ally.score,
      });
    }
    if (this.trackedChampion.trackedSummonerName === event.KillerName && (ally = this.allies.find(a => a.summonerName === event.VictimName))) {
      ally.score--;
      ally.deaths++;
      if (announce) this.deathAnnouncement({
        allySummonerName: event.VictimName,
        enemySummonerName: this.trackedChampion.trackedSummonerName,
        enemyChampionName: this.trackedChampion.trackedChampionName,
        newAllyScore: ally.score,
      });
    }
  }

  get isTracking(): boolean {
    return !!this.trackedChampion;
  }

  getScores(): Array<PlayerWithScore> {
    return this.allies;
  }

  finishTracking() {
    this.trackedChampion = null;
    this.allies = null;
  }
}