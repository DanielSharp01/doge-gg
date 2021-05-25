import { Message, TextChannel } from 'discord.js';
import fs from 'fs';
import { Player } from './Player';
import { PlayerWithScore } from './PlayerWithScore';
import { randomInt } from './randomInt';
import 'ts-replace-all';
import { SummonerCache } from './SummonerCache';
import { wsr } from './wsr';

export type StringKeyedStringArray = { [key: string]: Array<string> };
export type AliasReverseMap = { [key: string]: string | boolean };

export interface MessageEngineData {
    killMessages: StringKeyedStringArray;
    deathMessages: StringKeyedStringArray;
    killDeathMessages: StringKeyedStringArray;
    bountyMessages: StringKeyedStringArray;
    aliases: StringKeyedStringArray;
    gameOverMessages: {
        totaltie: Array<string>,
        positive: Array<string>,
        positivetie: Array<string>,
        zero: Array<string>,
        zerotie: Array<string>,
        negative: Array<string>,
        negativetie: Array<string>,
    }
}

function randomlyPick(arr: Array<string>): string {
    const r = randomInt(0, arr.length);
    return arr[r];
}

export class MessageEngine {
    private currentChannel: TextChannel;
    private engineData: MessageEngineData = {
        killMessages: {},
        deathMessages: {},
        killDeathMessages: {},
        bountyMessages: {},
        aliases: {},
        gameOverMessages: { negative: [], negativetie: [], zero: [], zerotie: [], positive: [], positivetie: [], totaltie: [] },
    };

    private aliasReverseMap: AliasReverseMap;

    constructor(private summonerCache: SummonerCache) {
        this.loadData();
    }

    useChannel(textChannel: TextChannel): MessageEngine {
        this.currentChannel = textChannel;
        return this;
    }

    loadData() {
        const reduceGroupKey = (groupKey: string) => {
            return Object.keys(this.engineData[groupKey]).reduce((acc, k) => {
                acc[wsr(k)] = this.engineData[groupKey][k];
                return acc;
            }, {})
        }

        if (fs.existsSync('./messageEngine.json')) {
            this.engineData = JSON.parse(fs.readFileSync('./messageEngine.json', { encoding: 'utf8' }));
            this.engineData = Object.keys(this.engineData).reduce((acc, k) => {
                acc[k] = reduceGroupKey(k);
                return acc;
            }, {} as MessageEngineData);
            this.recalculateAliasReverseMap();
        }
        this.saveData();
    }

    recalculateAliasReverseMap() {
        this.aliasReverseMap = {};
        Object.keys(this.engineData.aliases).forEach(champ => this.engineData.aliases[champ].forEach(alias => {
            if (this.aliasReverseMap[wsr(alias)]) this.aliasReverseMap[wsr(alias)] = true;
            else this.aliasReverseMap[wsr(alias)] = champ;
        }))
    }

    saveData() {
        fs.writeFileSync('./messageEngine.json', this.getData(), { encoding: 'utf8' });
    }

    getData(): string {
        return JSON.stringify(this.engineData, null, 2);
    }

    searchMessages(groupKey: string, key: string) {
        key = wsr(key);
        let compareFunction = k => k.includes(key);
        if (key.includes('vs')) {
            const [killer, victim] = key.split('vs').map(p => p.trim());
            compareFunction = k => {
                const [kr, vm] = k.split('vs').map(p => p.trim());
                return kr.includes(killer) && vm.includes(victim);
            }
        }
        return Object.keys(this.engineData[groupKey]).filter(compareFunction).map(k => this.engineData[groupKey][k].map(v => `**${k}** - ${v}`)).flat();
    }

    listMessages(groupKey: string, key: string) {
        key = wsr(key);
        return this.engineData[groupKey][key];
    }

    addMessage(groupKey: string, key: string, message: string) {
        key = wsr(key);
        if (!this.engineData[groupKey][key]) this.engineData[groupKey][key] = [];
        this.engineData[groupKey][key].push(message);
        if (groupKey === 'aliases') {
            if (this.aliasReverseMap[wsr(message)]) this.aliasReverseMap[message] = true;
            else this.aliasReverseMap[wsr(message)] = key;
        }
        this.saveData();
    }

    removeMessage(groupKey: string, key: string, what: string) {
        key = wsr(key);
        if (!this.engineData[groupKey][key]) throw new Error("No key");
        this.engineData[groupKey][key] = this.engineData[groupKey][key].filter(msg => !msg.includes(what));
        if (groupKey === 'aliases') {
            this.recalculateAliasReverseMap();
        }
        this.saveData();
    }

    processKillMessage(message: string, data: { killer: string, killerChampion: string, killerChampionSkin: string, victimChampion: string, victimChampionSkin: string }) {
        const killer = this.summonerCache.getMentionOrNot(data.killer) + (!this.summonerCache.hasMention(data.killer) ? ` (${this.aliasChampion(data.killerChampion, data.killerChampionSkin)})` : '');
        return message.replaceAll('$KILLER', killer)
            .replaceAll('$KILLER_NOALIAS', killer)
            .replaceAll('$VICTIM', this.aliasChampion(data.victimChampion, data.victimChampion))
            .replaceAll('$VICTIM_NOALIAS', data.victimChampion);
    }

    processDeathMessage(message: string, data: { killerChampion: string, killerChampionSkin: string, victim: string, victimChampion: string, victimChampionSkin: string }) {
        const victim = this.summonerCache.getMentionOrNot(data.victim) + (!this.summonerCache.hasMention(data.victim) ? ` (${this.aliasChampion(data.victimChampion, data.victimChampionSkin)})` : '');
        return message.replaceAll('$KILLER', this.aliasChampion(data.killerChampion, data.killerChampionSkin))
            .replaceAll('$KILLER_NOALIAS', data.killerChampion)
            .replaceAll('$VICTIM', victim)
            .replaceAll('$VICTIM_NOALIAS', victim);
    }

    processBountyMessage(message: string, data: { bountyPoster: string, champion: string, championSkin: string }) {
        return message.replaceAll('$BOUNTY_POSTER', this.summonerCache.getMentionOrNot(data.bountyPoster))
            .replaceAll('$CHAMPION', this.aliasChampion(data.champion, data.championSkin))
            .replaceAll('$CHAMPION_NOALIAS', data.champion);
    }

    processGameOverMessage(message: string, data: { winner: string }) {
        return message.replaceAll('$WINNER', data.winner);
    }

    getChampionVsMessages(groupKey: string, killer: Player, victim: Player): Array<string> {
        const skinOnSkin = this.engineData[groupKey][wsr(killer.skinName + ' vs ' + victim.skinName)] ?? [];
        const skinOnNoSkin = this.engineData[groupKey][wsr(killer.skinName + ' vs ' + victim.championName)] ?? [];
        const noSkinOnSkin = this.engineData[groupKey][wsr(killer.championName + ' vs ' + victim.skinName)] ?? [];
        const noSkinOnNoSkin = this.engineData[groupKey][wsr(killer.championName + ' vs ' + victim.championName)] ?? [];

        const skinOnUnk = this.engineData[groupKey][wsr(killer.skinName + ' vs ?')] ?? [];
        const noSkinOnUnk = this.engineData[groupKey][wsr(killer.championName + ' vs ?')] ?? [];
        const unkOnSkin = this.engineData[groupKey][wsr('? vs ' + victim.skinName)] ?? [];
        const unkOnNoSkin = this.engineData[groupKey][wsr('? vs ' + victim.championName)] ?? [];

        return [...skinOnSkin, ...skinOnNoSkin, ...noSkinOnSkin, ...noSkinOnNoSkin, ...skinOnUnk, ...noSkinOnUnk, ...unkOnSkin, ...unkOnNoSkin];
    }

    getChampionMessages(groupKey: string, championName: string, skinName: string): Array<string> {
        const skin = this.engineData[groupKey][wsr(skinName)] ?? [];
        const noSkin = this.engineData[groupKey][wsr(championName)] ?? [];

        return [...skin, ...noSkin];
    }

    aliasChampion(champion: string, skin: string) {
        return randomlyPick([champion, ...this.getChampionMessages('aliases', champion, skin)]);
    }

    unaliasChampion(championAlias: string) {
        const champ = this.aliasReverseMap[wsr(championAlias)];
        if (!champ || champ === true) return championAlias;
        return champ;
    }

    killMessage(killer: PlayerWithScore, victim: Player) {
        const possible = ['$KILLER killed $VICTIM', ...this.getChampionVsMessages('killDeathMessages', killer, victim), ...this.getChampionVsMessages('killMessages', killer, victim)];
        this.currentChannel.send(this.processKillMessage(randomlyPick(possible),
            { killer: killer.summonerName, killerChampion: killer.championName, killerChampionSkin: killer.skinName, victimChampion: victim.championName, victimChampionSkin: victim.skinName }));
    }

    deathMessage(killer: Player, victim: PlayerWithScore) {
        const possible = ['$VICTIM died to $KILLER', ...this.getChampionVsMessages('killDeathMessages', killer, victim), ...this.getChampionVsMessages('deathMessages', killer, victim)];
        this.currentChannel.send(this.processDeathMessage(randomlyPick(possible),
            { killerChampion: killer.championName, killerChampionSkin: killer.skinName, victim: victim.summonerName, victimChampion: victim.championName, victimChampionSkin: victim.skinName }));
    }

    bountyMessage(bountyPoster: Player, bounty: Player) {
        const possible = ['$BOUNTY_POSTER set out a bounty on $CHAMPION :coin:', ...this.getChampionMessages('bountyMessages', bounty.championName, bounty.skinName)];
        this.currentChannel.send(this.processBountyMessage(randomlyPick(possible), { bountyPoster: bountyPoster.summonerName, champion: bounty.championName, championSkin: bounty.skinName }));
    }

    gameOverMessage(winners: Array<PlayerWithScore>) {
        const winnerNames = winners.map(w => this.summonerCache.getMentionOrNot(w.summonerName));
        const winner = winnerNames.length > 1 ? winnerNames.slice(0, winnerNames.length - 1).join(', ') + ' and ' + winnerNames[winnerNames.length - 1] : winnerNames[0];
        const winnerScore = winners[0].score;

        this.currentChannel.send(this.processGameOverMessage((() => {
            if (winners.length === 5) {
                return randomlyPick(this.engineData.gameOverMessages.totaltie);
            } else if (winnerScore < 0) {
                if (winners.length > 1) return randomlyPick(this.engineData.gameOverMessages.negativetie);
                return randomlyPick(this.engineData.gameOverMessages.negative);
            } else if (winnerScore === 0) {
                if (winners.length > 1) return randomlyPick(this.engineData.gameOverMessages.zerotie);;
                return randomlyPick(this.engineData.gameOverMessages.zero);
            } else {
                if (winners.length > 1) return randomlyPick(this.engineData.gameOverMessages.positivetie);
                return randomlyPick(this.engineData.gameOverMessages.positive);
            }
        })(), { winner }));
    }

    recieveSummonerMessage(message: Message, summoner: string) {
        message.reply(randomlyPick([
            `All set ${summoner}`,
            `Got it ${summoner}`,
            `Nice name ${summoner}`,
            `Noted ${summoner}`,
            `Hello ${summoner}`,
            `Catchy ${summoner}`,
        ]) + ' :thumbsup:');
    }

    testMessage(groupKey: string, key: string, variables: { [key: string]: string }): string {
        let data = this.engineData[groupKey][wsr(key)];
        if (!data) return null;
        let message = randomlyPick(data);
        for (const k in variables) {
            message = message.replaceAll(`$${k}`, variables[k]);
        }
        return message;
    }
}