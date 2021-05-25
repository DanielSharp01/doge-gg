import { MessageEngine } from './MessageEngine';
import { CommandParser } from './CommandParser';
import readline from 'readline';
import { SummonerCache } from './SummonerCache';
import { Message, TextChannel } from 'discord.js';
import { GameManager } from './GameManager';
import { BountyGame } from './BountyGame';
import { wsr } from './wsr';
import { ChampionCache } from './ChampionCache';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

type aliasHandlerArgs = { action?: string, champion?: string, what?: string };
type onHandlerVsArgs = { killer: string, victim: string, action: string, what?: string };
type onHandlerArgs = { key: string, action: string, what?: string };

export class CommandHandler {
    private currentMessage: Message;
    constructor(private summonerCache: SummonerCache, private championCache: ChampionCache, private messageEngine: MessageEngine, private gameManager: GameManager) {
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
        const actions = ['me', 'charm', 'score', 'bounty', 'on', 'alias'];
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
                    case 'score':
                        this.scoreHandler();
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
                        this.testHandler(parser.reparemetrize<{ event: string, key: string }>());
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

    scoreHandler() {
        const summoner = this.getSummoner();
        if (!summoner) return;
        const miniGames = this.gameManager.games.map(g => g.miniGames).flat().filter(mg => mg.textChannel == this.currentMessage.channel && mg instanceof BountyGame).map(mg => mg as BountyGame);
        if (miniGames.length == 0) {
            this.currentMessage.channel.send('There are no bounty games that you participate in :confused:');
        }
        for (const miniGame of miniGames) {
            miniGame.printScoreTable()
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
                if (!this.validateChampion(champion)) return;
                this.currentMessage.channel.send(
                    this.messageEngine.listMessages('aliases', champion).join('\n') || 'No aliases found.',
                    { split: true },
                );
            },
            ({ champion, what }) => {
                if (!this.validateChampion(champion)) return;
                this.messageEngine.addMessage('aliases', champion, what);
                this.currentMessage.react('👍');
            },
            ({ champion, what }) => {
                if (!this.validateChampion(champion)) return;
                this.messageEngine.removeMessage('aliases', champion, what);
                this.currentMessage.react('👍');
            },
        );
    }
    validateChampion(champion: string): boolean {
        if (champion != '?' && !this.championCache.getChampionFromString(champion)) {
            this.errorMessage(`${champion} is not a valid champion or skin.`);
            return false;
        }

        return true;
    }

    onHandler(parser: CommandParser<{ event: string }>) {
        const eventKeyParser = parser.expectAnyWord('event');
        const event = eventKeyParser.parameters.event.replace('kill-death', 'killDeath');
        const codifyVariables = str => {
            return str.replaceAll(/(\$[A-Za-z0-9_]*)/g, "`$1`");
        }

        if (this.isVsEvent(event)) {
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
                    if (!this.validateChampion(killer) || !this.validateChampion(victim)) return;
                    this.currentMessage.channel.send(
                        this.messageEngine.listMessages(`${event}Messages`, `${killer ?? '?'} vs ${victim ?? '?'}`).map(codifyVariables).join('\n') || 'No messages found.',
                        { split: true },
                    );
                },
                ({ killer, victim, what }) => {
                    if (!this.validateChampion(killer) || !this.validateChampion(victim)) return;
                    this.messageEngine.addMessage(`${event}Messages`, `${killer} vs ${victim}`, what);
                    this.currentMessage.react('👍');
                },
                ({ killer, victim, what }) => {
                    if (!this.validateChampion(killer) || !this.validateChampion(victim)) return;
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

    isVsEvent(event: string) {
        const championVSEventKeys = ['kill', 'death', 'killDeath'];
        return championVSEventKeys.includes(event);
    }

    testHandler(parser: CommandParser<{ event: string, key: string }>) {
        parser.expectAnyWord('event').executeError(() => {
            this.errorMessage(`Expected event`);
        }).choice(
            p => p.expectUntilEnd('key').remapError((e, p) => {
                if (e) return e;
                if (p.key.includes('$')) return { name: 'custom' };
                return e;
            }),
            p => p.expectUntilWord('key', 'for').expectVariables().executeError((e, p) => {
                if (e.name == 'expectUntilWord') {
                    if (e.missing || e.missingBetween) {
                        if (this.isVsEvent(p.event.replace('kill-death', 'killDeath'))) {
                            this.errorMessage(`Expected \`<killer> vs <victim>\``);
                        } else {
                            this.errorMessage(`Expected ${p.event == 'alias' ? 'champion' : 'key'}`);
                        }
                    }
                    else {
                        this.errorMessage(`Expected \`for\` before variable list`);
                    }
                } else if (e.name == 'expectVariable') {
                    if (e.missingDollar) {
                        this.errorMessage(`Expected $`);
                    } else if (e.missingEquals) {
                        this.errorMessage(`Expected =`);
                    } else if (e.missingVariable) {
                        this.errorMessage(`Expected variable name`);
                    } else if (e.missingValue) {
                        this.errorMessage(`Expected variable value`);
                    }
                }
            })
        ).execute((p: any) => {
            const supportedEvents = ['kill', 'death', 'bounty', 'gameover', 'alias'];
            if (!supportedEvents.includes(p.event.toLowerCase())) {
                this.errorMessage(`Unsupported event supported events are ${supportedEvents.map(e => `\`${e}\``)}`);
                return;
            }
            if (this.isVsEvent(p.event) && !p.key.includes(' vs ')) {
                this.errorMessage(`Expected \`<killer> vs <victim>\``);
                return;
            }
            let killerChampion, killerSkin, victimChampion, victimSkin;
            let champion, skin;
            if (this.isVsEvent(p.event)) {
                const [killer, victim] = p.key.split(' vs ').map(p => p.trim());
                killerChampion = this.championCache.getChampionFromString(wsr(killer));
                killerSkin = this.championCache.getSkinFromString(wsr(killer));
                victimChampion = this.championCache.getChampionFromString(wsr(victim));
                victimSkin = this.championCache.getSkinFromString(wsr(victim));

                if (!killerChampion) {
                    this.errorMessage(`Unknown champion or skin \`${killer}\``);
                    return;
                } else if (!victimChampion) {
                    this.errorMessage(`Unknown champion or skin \`${victim}\``);
                    return;
                }
            } else if (p.event == 'alias' || p.event == 'bounty') {
                champion = this.championCache.getChampionFromString(wsr(p.key));
                skin = this.championCache.getSkinFromString(wsr(p.key));
                if (!champion) {
                    this.errorMessage(`Unknown champion or skin \`${p.key}\``);
                    return;
                }
            }
            switch (p.event.toLowerCase()) {
                case 'kill':
                    this.messageEngine.useChannel(this.currentMessage.channel as TextChannel).killMessage(
                        { summonerName: p.KILLER, championName: killerChampion, skinName: killerSkin, score: 0, kills: 0, deaths: 0, team: '' },
                        { summonerName: p.VICTIM, championName: victimChampion, skinName: victimSkin, team: '' },
                    )
                    break;
                case 'death':
                    this.messageEngine.useChannel(this.currentMessage.channel as TextChannel).deathMessage(
                        { summonerName: p.KILLER, championName: killerChampion, skinName: killerSkin, team: '' },
                        { summonerName: p.VICTIM, championName: victimChampion, skinName: victimSkin, score: 0, kills: 0, deaths: 0, team: '' },
                    )
                    break;
                case 'bounty':
                    this.messageEngine.useChannel(this.currentMessage.channel as TextChannel).bountyMessage(
                        { summonerName: p.BOUNTY_POSTER, championName: '', skinName: '', team: '' },
                        { summonerName: '', championName: champion, skinName: skin, team: '' },
                    )
                    break;
                case 'gameover':
                    const message = this.messageEngine.testMessage('gameOverMessages', p.key, { WINNER: p.WINNER });
                    if (message) this.currentMessage.channel.send(message);
                    else this.currentMessage.channel.send(`No game over message for \`${p.key}\``);
                    break;
                case 'alias':
                    this.currentMessage.channel.send(this.messageEngine.aliasChampion(champion, skin));
                    break;
            }
        });
    }
}