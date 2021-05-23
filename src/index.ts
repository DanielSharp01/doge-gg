import { config } from 'dotenv';
import { CommandParser, CustomError, ParserError } from './CommandParser';
import { DiscordBot } from './DiscordBot';
import { Game } from './Game';
import { startWebsocketServer } from './WebsocketServer';

import fs from 'fs';
import process from 'process';

config();

/*const game = new Game();
startWebsocketServer(game);
const discordBot = new DiscordBot(game);*/

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
    const parser = new CommandParser<{ action: string }>(command);
    const actions = ['me', 'charm', 'bounty', 'on', 'alias'];
    parser.expectWord('!gg').expectAnyWord('action')
        .executeError(() => {
            console.log(`No action specified use one of ${actions.map(a => `\`${a}\``).join(', ')}`);
        })
        .execute(({ action }, parser) => {
            switch (action) {
                case 'me':
                    meHandler(parser.reparemetrize<{ summoner: string }>());
                    break;
                case 'charm':
                    charmHandler();
                    break;
                case 'bounty':
                    bountyHandler(parser.reparemetrize<{ champion: string }>());
                    break;
                case 'alias':
                    aliasHandler(parser.reparemetrize<{ action: string, champion?: string, what?: string }>());
                    break;
                case 'on':
                    break;
                default:
                    console.log(`No such action \`${action}\` use one of ${actions.map(a => `\`${a}\``).join(', ')}`);
            }
        });

}

function meHandler(parser: CommandParser<{ summoner: string }>) {
    parser.expectUntilEnd('summoner').execute(({ summoner }) => {
        console.log('Set me as summoner', summoner);
    }).executeError(() => {
        console.log('No summoner specified');
    });
}

function bountyHandler(parser: CommandParser<{ champion: string }>) {
    parser.expectUntilEnd('champion').execute(({ champion }) => {
        console.log('Set a bounty on ' + champion);
    }).executeError(() => {
        console.log('No champion specified');
    });
}

type aliasHandlerArgs = { action?: string, champion?: string, what?: string };

function aliasHandler(parser: CommandParser<aliasHandlerArgs>) {
    const actions = ['list', 'add', 'remove'];
    parser.choice(
        p => p.expectWord('list', false, 'action').optionalUntilEnd('champion').execute(({ champion }) => {
            console.log('Search for aliases of', champion);
        }),
        p => {
            const actionParser = p.expectUntilAnyOfWords('champion', actions, false, 'action')
                .executeError((e: ParserError<aliasHandlerArgs> & { name: 'expectUntilAnyOfWords' }) => {
                    if (e.missingBetween || e.missing) console.log('No champion specified');
                    else console.log(`No action specified use one of ${actions.map(a => `\`${a}\``).join(', ')}`)
                });
            if (actionParser.parameters.action == 'list') {
                actionParser.execute(({ champion }) => {
                    console.log('List aliases for', champion);
                })
            } else if (!actionParser.error) {
                actionParser.expectUntilEnd('what').execute(({ action, champion, what }) => {
                    switch (action) {
                        case 'add':
                            console.log(`Add to ${champion}'s aliases ${what}`);
                            break;
                        case 'remove':
                            console.log(`Remove from ${champion}'s aliases ${what}`);
                            break;
                    }
                }).executeError((_e, { action }) => {
                    console.log(`What are you ${action.replace(/e$/, '')}ing?`);
                })
            }

            return actionParser;
        }
    )
}

function charmHandler() {
    console.log('Setup charm');
}