import { AddressInfo } from 'net';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { GameClientMessage } from './GameClientMessage';
import { Game } from './Game';
import { GameManager } from './GameManager';

export function startWebsocketServer(gameManager: GameManager) {
    const app = express();
    const server = createHttpServer(app);
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        let uuid;
        let connectedGame: Game = null;
        ws.on('message', (msg: string) => {
            const message: GameClientMessage = JSON.parse(msg);
            if (message.type == "connect") {
                ws.send(JSON.stringify({ type: 'connected' }));
                uuid = message.uuid;
            }
            else if (message.type == "clientConnected") {
                connectedGame = gameManager.getOrCreateGame(message.players);
                connectedGame.addClient(uuid);
            }
            else if (message.type == "clientDisconnected") {
                connectedGame?.removeClient(uuid);
                connectedGame = null;
            }
            else connectedGame?.onMessage(message);
        });
        ws.on('close', () => {
            connectedGame?.removeClient(uuid);
            connectedGame = null;
        })
    });

    server.listen(process.env.PORT || 5050, () => {
        console.log(`Server started on port ${(server.address() as AddressInfo).port}`);
    });
}