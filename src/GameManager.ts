import { Game } from './Game';
import { wsr } from "./wsr";
import { Player } from './Player';
import { BountyGame } from './BountyGame';
import { CharmGame } from './CharmGame';
import { TextChannel } from 'discord.js';
import { MessageEngine } from './MessageEngine';
import { SummonerCache } from './SummonerCache';
import { MiniGame } from './MiniGame';

export class GameManager {
    public games: Game[] = [];

    constructor(private messageEngine: MessageEngine, private summonerCache: SummonerCache) {
    }

    public getOrCreateGame(players: Player[]) {
        const created = new Game(players);
        const existing = this.games.find(g => g.equals(created));
        if (existing) {
            return existing;
        }
        this.games.push(created);
        this.startImplicitMiniGames(created);
        return created;
    }

    public cleanupGames() {
        const removables = new Set<Game>();
        for (const game of this.games) {
            if (!game.hasClients && game.lastHadClients + 30000 < Date.now()) {
                removables.add(game);
                game.onGameOver(); // TODO: Verify implicit game over
            }
        }


        this.games = this.games.filter(g => !removables.has(g));
    }

    createMiniGameContext(textChannel: TextChannel) {
        return { textChannel, messageEngine: this.messageEngine, summonerCache: this.summonerCache };
    }

    findGame(summoner: string) {
        return this.games.find(g => g.players.some(p => p.summonerName == summoner));
    }

    async waitForGame(finder: () => Game): Promise<Game> {
        return new Promise(resolve => {
            let game = null;
            let seconds = 30;
            const callback = () => {
                seconds--;
                game = finder();
                if (game) resolve(game);
                if (seconds == 0) {
                    resolve(null);
                    return;
                }
                setTimeout(callback, 1000);
            }
            callback();
        });
    }

    async startBountyGame(textChannel: TextChannel, summoner: string, champOrSkin: string): Promise<{ found: boolean, enemyFound: boolean }> {
        const game = await this.waitForGame(() => this.games.find(g => g.players.some(p => p.summonerName == summoner)));
        if (!game) return { found: false, enemyFound: false };
        const poster = game.players.find(p => p.summonerName === summoner);
        const team = poster.team;
        const allies = game.players.filter(p => p.team === team);
        const enemies = game.players.filter(p => p.team !== team);
        const enemy = enemies.find(e => wsr(e.championName) === wsr(champOrSkin) || wsr(e.skinName) === wsr(champOrSkin));
        if (enemy) {
            this.startMiniGame(game, new BountyGame(this.createMiniGameContext(textChannel), allies, poster, enemy));
            return { found: true, enemyFound: true };
        }
        return { found: true, enemyFound: false };
    }

    async startCharmGame(textChannel: TextChannel, summoner: string): Promise<{ found: boolean, ahriFound: boolean }> {
        const game = await this.waitForGame(() => this.games.find(g => g.players.some(p => p.summonerName == summoner)));
        if (!game) return { found: false, ahriFound: false };
        if (game.players.find(p => p.summonerName === summoner).championName === 'Ahri') {
            this.startMiniGame(game, new CharmGame(this.createMiniGameContext(textChannel), summoner));
            return { found: true, ahriFound: true };
        }
        return { found: true, ahriFound: false };
    }

    startImplicitMiniGames(game: Game) {
        for (const summoner of this.summonerCache.summonerList) {
            if (game.players.find(p => p.summonerName === summoner)?.championName === 'Ahri') {
                this.startMiniGame(game, new CharmGame(this.createMiniGameContext(null), summoner));
            }
        }
    }

    private startMiniGame(game: Game, miniGame: MiniGame): boolean {
        return game.startMiniGame(miniGame);
    }
}