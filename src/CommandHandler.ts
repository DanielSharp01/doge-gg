import { MessageEngine } from './MessageEngine';
import { Message } from 'discord.js';
import { CommandParser, ParserError } from './CommandParser';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

type aliasHandlerArgs = { action?: string, champion?: string, what?: string };
type onHandlerVsArgs = { killer: string, victim: string, action: string, what?: string };
type onHandlerArgs = { key: string, action: string, what?: string };

export class CommandHandler {
    constructor(summonerCache: any, championCache: any, messageEngine: MessageEngine) {

    }

    async testLoop() {
        console.log('Your command:');
        for await (const command of rl) {
            this.recievedMessage({ content: command });
            console.log('Your command:');
        }
    }

    recievedMessage(message: { content: string }) { // TODO: Change to discord message
        const parser = new CommandParser<{ action: string }>(message.content);
        const actions = ['me', 'charm', 'bounty', 'on', 'alias'];
        parser.expectWord('!gg').expectAnyWord('action')
            .executeError(() => {
                console.log(`No action specified use one of ${actions.map(a => `\`${a}\``).join(', ')}`);
            })
            .execute(({ action }, parser) => {
                switch (action) {
                    case 'me':
                        this.meHandler(parser.reparemetrize<{ summoner: string }>());
                        break;
                    case 'charm':
                        this.charmHandler();
                        break;
                    case 'bounty':
                        this.bountyHandler(parser.reparemetrize<{ champion: string }>());
                        break;
                    case 'alias':
                        this.aliasHandler(parser.reparemetrize<aliasHandlerArgs>());
                        break;
                    case 'on':
                        this.onHandler(parser.reparemetrize<{ event: string }>());
                        break;
                    default:
                        console.log(`No such action \`${action}\` use one of ${actions.map(a => `\`${a}\``).join(', ')}`);
                }
            });
    }

    meHandler(parser: CommandParser<{ summoner: string }>) {
        parser.expectUntilEnd('summoner').execute(({ summoner }) => {
            console.log('Set me as summoner', summoner);
        }).executeError(() => {
            console.log('No summoner specified');
        });
    }

    bountyHandler(parser: CommandParser<{ champion: string }>) {
        parser.expectUntilEnd('champion').execute(({ champion }) => {
            console.log('Set a bounty on ' + champion);
        }).executeError(() => {
            console.log('No champion specified');
        });
    }

    messageHandler<M extends { [key: string]: string, action: string, what: string }>(
        parser: CommandParser<M>,
        keyParsing: (p: CommandParser<M>) => CommandParser<M>,
        keyStartParsing: (p: CommandParser<M>) => CommandParser<M>,
        keyEndName: string,
        keyDisplayName: string,
        searchExecutor: (props: Partial<M>) => void,
        listExecutor: (props: Partial<M>) => void,
        addExectutor: (props: Partial<M>) => void,
        removeExectutor: (props: Partial<M>) => void,
    ) {
        const actions = ['list', 'add', 'remove'];
        parser.choice(
            p => p.expectWord('list', false, 'action').choice(p => p.expectEnded(), keyParsing).execute(searchExecutor),
            p => {
                const actionParser = keyStartParsing(p).expectUntilAnyOfWords(keyEndName, actions, false, 'action')
                    .executeError(e => {
                        if (e.name != 'expectUntilAnyOfWords') return;
                        if (e.missingBetween || e.missing) console.log(`No ${keyDisplayName} specified`);
                        else console.log(`No action specified use one of ${actions.map(a => `\`${a}\``).join(', ')}`)
                    });
                if (actionParser.parameters.action == 'list') {
                    actionParser.execute(listExecutor);
                } else if (!actionParser.error) {
                    actionParser.expectUntilEnd('what').execute(props => {
                        switch (props.action) {
                            case 'add':
                                addExectutor(props);
                                break;
                            case 'remove':
                                removeExectutor(props);
                                break;
                        }
                    }).executeError((_e, { action }) => {
                        console.log(`What are you ${action.replace(/e$/, '')}ing?`);
                    });
                }

                return actionParser;
            },
        );
    }

    aliasHandler(parser: CommandParser<aliasHandlerArgs>) {
        this.messageHandler(parser, p => p.expectUntilEnd('champion'), p => p, 'champion', 'champion',
            ({ champion }) => {
                console.log('Search for aliases of', champion);
            },
            ({ champion }) => {
                console.log('List aliases for', champion);
            },
            ({ champion, what }) => {
                console.log(`Add to ${champion}'s aliases ${what}`);
            },
            ({ champion, what }) => {
                console.log(`Remove from ${champion}'s aliases ${what}`);
            },
        );
    }

    // on kill ahri list   ? vs ahri
    // on death ahri add   ahri vs ?
    // on kill-death ahri add   ahri vs ?  - I am ahri or i am dieing to ahri
    // on kill-death ahri add ? vs ahri - I am against ahri or I kill an ahri

    onHandler(parser: CommandParser<{ event: string }>) {
        const eventKeyParser = parser.expectAnyWord('event');
        const championVSEventKeys = ['kill', 'death', 'kill-death'];
        const event = eventKeyParser.parameters.event;
        if (championVSEventKeys.includes(event)) {
            eventKeyParser.reparemetrize<onHandlerVsArgs>();
        } else if (!eventKeyParser.error) {
            this.messageHandler(eventKeyParser.reparemetrize<onHandlerArgs>(), p => p.expectUntilEnd('key'), p => p, 'key', 'key',
                ({ key }) => {
                    console.log(`Search for messages of ${event}.${key}`);
                },
                ({ key }) => {
                    console.log(`List messages for ${event}.${key}`);
                },
                ({ key, what }) => {
                    console.log(`Add to ${event}.${key}'s messages ${what}`);
                },
                ({ key, what }) => {
                    console.log(`Remove from ${event}.${key}'s messages ${what}`);
                },
            );
        } else {
            console.log('No event specified');
        }

        return eventKeyParser;
    }

    charmHandler() {
        console.log('Setup charm');
    }
}