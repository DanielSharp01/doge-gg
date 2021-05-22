import { AddressInfo } from 'net';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import WebSocket, { Server as WebSocketServer } from 'ws';
import { GameClientMessage } from './GameClientMessage';
import { Game } from './Game';

// TODO: Multi game client => multi game resolution
export function startWebsocketServer(game: Game) {
    const app = express();
    const server = createHttpServer(app);
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        let uuid;
        ws.on('message', (msg: string) => {
            const message: GameClientMessage = JSON.parse(msg);
            if (message.type == "connect") {
                ws.send(JSON.stringify({ type: 'connected' }));
                uuid = message.uuid;
            }
            else game.onMessage(message);
        });
        ws.on('close', () => {
            game.onMessage({ type: 'clientDisconnected', uuid })
        })
    });

    server.listen(process.env.PORT || 5050, () => {
        console.log(`Server started on port ${(server.address() as AddressInfo).port}`);
    });
}