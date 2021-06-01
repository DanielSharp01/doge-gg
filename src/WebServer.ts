import { AddressInfo } from 'net';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { GameClientMessage } from './GameClientMessage';
import { Game } from './Game';
import { GameManager } from './GameManager';
import { BountyGame } from './BountyGame';
import { CharmGame } from './CharmGame';
import { MiniGame } from './MiniGame';

export function startWebServer(gameManager: GameManager) {
    const app = express();
    const server = createHttpServer(app);
    const wss = new WebSocketServer({ server });
    const uuidSummonerMap = new Map<string, string>();

    wss.on('connection', (ws: WebSocket) => {
        let uuid;
        let connectedGame: Game = null;
        ws.on('message', (msg: string) => {
            const message: GameClientMessage = JSON.parse(msg);
            if (message.type == "connect") {
                ws.send(JSON.stringify({ type: 'connected' }));
                uuid = message.uuid;
                uuidSummonerMap.set(uuid, null);
            }
            else if (message.type == "clientConnected") {
                connectedGame = gameManager.getOrCreateGame(message.players);
                connectedGame.addClient(uuid);
                uuidSummonerMap.set(uuid, message.activePlayerName);
            }
            else if (message.type == "clientDisconnected") {
                connectedGame?.removeClient(uuid);
                connectedGame = null;
                uuidSummonerMap.set(uuid, null);
            }
            else connectedGame?.onMessage(message);
        });
        ws.on('close', () => {
            connectedGame?.removeClient(uuid);
            uuidSummonerMap.delete(uuid);
            connectedGame = null;
        })
    });

    const mapMiniGame = (miniGame: MiniGame) => {
        if (!miniGame) return miniGame;
        if (miniGame instanceof BountyGame) {
            return {
                type: 'bounty',
                allies: miniGame.allies,
                enemy: miniGame.enemy,
            }
        } else if (miniGame instanceof CharmGame) {
            return {
                type: 'charm',
                summoner: miniGame.summoner,
                charmCast: miniGame.charmCast,
                charmHit: miniGame.charmHit,
                announce: !!miniGame.textChannel
            }
        } else {
            return { type: 'unknown' }
        }
    }

    const mapGame = (game: Game) => {
        if (!game) return game;
        return {
            uuid: game.uuid,
            events: game.events,
            players: game.players,
            lastHadClients: new Date(game.lastHadClients).toISOString(),
            miniGames: game.miniGames.map(mapMiniGame),
            clients: [...game.clients].map(uuid => ({
                uuid,
                activePlayerName: uuidSummonerMap.get(uuid),
            })),
        }
    }

    app.get('/clients', (req, res, next) => {
        res.json([...uuidSummonerMap.entries()].map(([uuid, activePlayerName]) => ({
            uuid,
            activePlayerName,
        })));
    });

    app.get('/games', (req, res, next) => {
        res.json(gameManager.games.map(mapGame));
    });

    app.get('/games/:uuid', (req, res, next) => {
        res.json(mapGame(gameManager.games.find(g => g.uuid == req.params.uuid)));
    });

    server.listen(process.env.PORT || 5050, () => {
        console.log(`Server started on port ${(server.address() as AddressInfo).port}`);
    });
}