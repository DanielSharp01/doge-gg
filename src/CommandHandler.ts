import { MessageEngine } from './MessageEngine';
import { CommandParser } from './CommandParser';
import readline from 'readline';
import { SummonerCache } from './SummonerCache';
import { Message, TextChannel } from 'discord.js';
import { GameManager } from './GameManager';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

type aliasHandlerArgs = { action?: string, champion?: string, what?: string };
type onHandlerVsArgs = { killer: string, victim: string, action: string, what?: string };
type onHandlerArgs = { key: string, action: string, what?: string };

// TODO: Actual command logic

export class CommandHandler {
    private currentMessage: Message;
    // TODO: ChampionCache
    constructor(private summonerCache: SummonerCache, private messageEngine: MessageEngine, private gameManager: GameManager) {

    }

    errorMessage(message: string) {
        this.currentMessage.react('❌');
        this.currentMessage.reply(message);
    }

    successMessage(message: string) {
        this.currentMessage.react('👍');
        this.currentMessage.reply(message);
    }

    getSummoner() {
        const summoner = this.summonerCache.getSummoner(this.currentMessage.author.id);
        if (!summoner) {
            this.currentMessage.reply("I don't know your summoner :rolling_eyes:\nTo use this command type `!gg me <your summoner>` first.");
        }
        return summoner;
    }

    recievedMessage(message: Message) {
        if (!message.content.startsWith('!gg')) return;
        this.currentMessage = message;
        const parser = new CommandParser<{ action: string }>(message.content);
        const actions = ['me', 'charm', 'bounty', 'on', 'alias'];
        parser.expectWord('!gg').expectAnyWord('action')
            .executeError(() => {
                this.errorMessage(`No action specified use one of ${actions.map(a => `\`${a}\``).join(', ')}`);
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
                    case 'test':
                        // TODO: Test command
                        break;
                    default:
                        this.errorMessage(`No such action \`${action}\` use one of ${actions.map(a => `\`${a}\``).join(', ')}`);
                }
            });
    }

    meHandler(parser: CommandParser<{ summoner: string }>) {
        parser.optionalUntilEnd('summoner').execute(({ summoner }) => {
            if (summoner) {
                this.summonerCache.setSummoner(this.currentMessage.author.id, summoner);
                this.currentMessage.react('👍');
                this.messageEngine.recieveSummonerMessage(this.currentMessage, summoner);
            } else {
                const summoner = this.summonerCache.getSummoner(this.currentMessage.author.id);
                if (summoner) {
                    this.currentMessage.reply(`Hi there *${summoner}* :wave:`)
                } else {
                    this.currentMessage.reply("I don't know you :pensive:")
                }
            }
        });
    }

    bountyHandler(parser: CommandParser<{ champion: string }>) {
        const summoner = this.getSummoner();
        if (!summoner) return;
        parser.expectUntilEnd('champion').execute(async ({ champion }) => {
            this.currentMessage.react('⏳');
            const bountyRes = await this.gameManager.startBountyGame(this.currentMessage.channel as TextChannel, summoner, this.messageEngine.unaliasChampion(champion));
            if (!bountyRes.found) {
                this.currentMessage.react('⏳');
                this.errorMessage('Could not find your game :pensive: Make sure the Doge.gg client is running for you or for a friend in game with you.');
            } else if (!bountyRes.enemyFound) {
                this.currentMessage.react('⏳');
                this.errorMessage(`Could not find ${champion} in the enemy team. :pensive:`);
            } else {
                this.currentMessage.react('⏳');
                this.currentMessage.react('👍');
            }
        }).executeError(() => {
            this.errorMessage('No champion specified');
        });
    }

    async charmHandler() {
        const summoner = this.getSummoner();
        if (!summoner) return;
        const charmRes = await this.gameManager.startCharmGame(this.currentMessage.channel as TextChannel, this.summonerCache.getSummoner(this.currentMessage.author.id));
        this.currentMessage.react('⏳');
        if (!charmRes.found) {
            this.currentMessage.react('⏳');
            this.errorMessage('Could not find your game :pensive: Make sure the Doge.gg client is running for you or for a friend in game with you.');
        } else if (!charmRes.ahriFound) {
            this.currentMessage.react('⏳');
            this.errorMessage(`You are not playing Ahri :rolling_eyes:`);
        } else {
            this.currentMessage.react('⏳');
            this.currentMessage.react('👍');
        }
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
            p => p.expectWord('list', false, 'action').choice(p => p.expectEnded(), keyParsing).execute(searchExecutor).mapError(err => {
                if (err.name != 'expectWord') return null;
                return err;
            }),
            p => {
                const actionParser = keyStartParsing(p).expectUntilAnyOfWords(keyEndName, actions, false, 'action')
                    .executeError(e => {
                        if (e.name != 'expectUntilAnyOfWords') return;
                        if (e.missingBetween || e.missing) this.errorMessage(`No ${keyDisplayName} specified`);
                        else this.errorMessage(`No action specified use one of ${actions.map(a => `\`${a}\``).join(', ')}`)
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
                        this.errorMessage(`What are you ${action.replace(/e$/, '')}ing?`);
                    });
                }

                return actionParser;
            },
        );
    }

    aliasHandler(parser: CommandParser<aliasHandlerArgs>) {
        this.messageHandler(parser, p => p.expectUntilEnd('champion'), p => p, 'champion', 'champion',
            ({ champion }) => {
                this.currentMessage.channel.send(
                    this.messageEngine.searchMessages('aliases', champion).join('\n') || 'No aliases found.',
                    { split: true },
                );
            },
            ({ champion }) => {
                this.currentMessage.channel.send(
                    this.messageEngine.listMessages('aliases', champion).join('\n') || 'No aliases found.',
                    { split: true },
                );
            },
            ({ champion, what }) => {
                this.messageEngine.addMessage('aliases', champion, what);
                this.currentMessage.react('👍');
            },
            ({ champion, what }) => {
                this.messageEngine.removeMessage('aliases', champion, what);
                this.currentMessage.react('👍');
            },
        );
    }

    onHandler(parser: CommandParser<{ event: string }>) {
        const eventKeyParser = parser.expectAnyWord('event');
        const championVSEventKeys = ['kill', 'death', 'killDeath'];
        const event = eventKeyParser.parameters.event.replace('kill-death', 'killDeath');
        const codifyVariables = str => {
            return str.replaceAll(/(\$[A-Za-z0-9_]*)/g, "`$1`");
        }

        if (championVSEventKeys.includes(event)) {
            this.messageHandler(eventKeyParser.reparemetrize<onHandlerVsArgs>(),
                p => p
                    .optionalUntilWord('killer', 'vs', false)
                    .optionalUntilEnd('victim'),
                p => p.expectUntilWord('killer', 'vs', false).executeError(e => {
                    if (e.name != 'expectUntilWord') return;
                    if (e.missingBetween) this.errorMessage(`No killer champion specified`);
                    else if (e.missing) this.errorMessage('No killer, victim pair specified');
                    else this.errorMessage('Expected vs');
                }), 'victim', 'victim champion',
                ({ killer, victim }) => {
                    this.currentMessage.channel.send(
                        this.messageEngine.searchMessages(`${event}Messages`, `${killer ?? ''} vs ${victim ?? ''}`).map(codifyVariables).join('\n') || 'No messages found.',
                        { split: true },
                    );
                },
                ({ killer, victim }) => {
                    this.currentMessage.channel.send(
                        this.messageEngine.listMessages(`${event}Messages`, `${killer ?? '?'} vs ${victim ?? '?'}`).map(codifyVariables).join('\n') || 'No messages found.',
                        { split: true },
                    );
                },
                ({ killer, victim, what }) => {
                    this.messageEngine.addMessage(`${event}Messages`, `${killer} vs ${victim}`, what);
                    this.currentMessage.react('👍');
                },
                ({ killer, victim, what }) => {
                    this.messageEngine.removeMessage(`${event}Messages`, `${killer} vs ${victim}`, what);
                    this.currentMessage.react('👍');
                },
            );
        } else if (!eventKeyParser.error) {
            this.messageHandler(eventKeyParser.reparemetrize<onHandlerArgs>(), p => p.expectUntilEnd('key'), p => p, 'key', 'key',
                ({ key }) => {
                    this.currentMessage.channel.send(
                        this.messageEngine.searchMessages(`${event}Messages`, key ?? '').map(codifyVariables).join('\n') || 'No messages found.',
                        { split: true },
                    );
                },
                ({ key }) => {
                    this.currentMessage.channel.send(
                        this.messageEngine.listMessages(`${event}Messages`, key).map(codifyVariables).join('\n') || 'No messages found.',
                        { split: true },
                    );
                },
                ({ key, what }) => {
                    this.messageEngine.addMessage(`${event}Messages`, key, what);
                    this.currentMessage.react('👍');
                },
                ({ key, what }) => {
                    this.messageEngine.removeMessage(`${event}Messages`, key, what);
                    this.currentMessage.react('👍');
                },
            );
        } else {
            this.errorMessage('No event specified');
        }

        return eventKeyParser;
    }
}