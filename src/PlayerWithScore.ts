import { Player } from './Player';

export interface PlayerWithScore extends Player {
    score: number;
    deaths: number;
    kills: number;
}
