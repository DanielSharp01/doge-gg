import fs from 'fs';
export class SummonerCache {
    private summoners: { [key: string]: string } = {};
    constructor() {
        if (fs.existsSync('./summoners.json')) {
            this.summoners = JSON.parse(fs.readFileSync('./summoners.json', { encoding: 'utf8' }));
        } else {
            this.saveSummoners();
        }
    }

    setSummoner(discordId: string, summoner: string) {
        this.summoners[discordId] = summoner;
        this.saveSummoners();
    }

    saveSummoners() {
        fs.writeFileSync('./summoners.json', JSON.stringify(this.summoners, null, 2), { encoding: 'utf8' });
    }

    getSummoner(id: string): string {
        return this.summoners[id];
    }

    getDiscordId(summoner: string): string {
        return Object.keys(this.summoners).find(id => this.summoners[id] === summoner);
    }

    hasMention(summoner: string): boolean {
        return !!this.getDiscordId(summoner);
    }

    getMentionOrNot(summoner: string): string {
        const discordId = this.getDiscordId(summoner);
        return discordId ? `<@${discordId}>` : summoner;
    }
}