import { config } from 'dotenv';
import { CommandParser, CustomError } from './CommandParser';
import { DiscordBot } from './DiscordBot';
import { Game } from './Game';
import { startWebsocketServer } from './WebsocketServer';

import fs from 'fs';
import process from 'process';

config();

/*const game = new Game();
startWebsocketServer(game);
const discordBot = new DiscordBot(game);*/

const both = (p: CommandParser<any>) => ({ parameters: p.parameters, error: p.error });

const readline = () => {
    try {
        const buffer = Buffer.alloc(256);
        const read = fs.readSync(process.stdin.fd, buffer, 0, 256, null);
        return buffer.toString('ascii').slice(0, read).trim();
    } catch (err) {
        return null;
    }
}

while (true) {
    const command = readline();
    const parser = new CommandParser<{ action: string, summoner: string, champion: string, groupKey: string }>(command);
    console.log(both(
        parser.expectWord('!gg').choice(
            p => p.expectWord('me', false, 'action').expectUntilEnd('summoner').mapError(err => {
                return { name: 'custom', action: 'me', type: err.name != 'expectWord' ? 'no-summoner' : 'not-this-command' }
            }),
            p => p.expectWord('charm', false, 'action').mapError(err => {
                return { name: 'custom', action: 'charm', type: 'not-this-command' }
            }),
            p => p.expectWord('bounty', false, 'action').expectUntilEnd('champion').mapError(err => {
                return { name: 'custom', action: 'bounty', type: err.name != 'expectWord' ? 'no-champ' : 'not-this-command' }
            }),
            p => p.expectWord('on', false, 'action').expectAnyWord('groupKey').mapError(err => {
                return { name: 'custom', action: 'on', type: err.name != 'expectWord' ? 'no-groupKey' : 'not-this-command' }
            }),
        ).mapError(err => {
            if (err.name == "choice") {
                const specificError = err.errors.find((e: CustomError) => e.type !== "not-this-command");
                if (specificError) {
                    return specificError;
                } else {
                    return { name: 'custom', type: 'no-action', actions: err.errors.map((e: CustomError) => e.action) };
                }
            } else {
                return { name: 'custom', type: 'no-gg' };
            }
        })
    ));
}