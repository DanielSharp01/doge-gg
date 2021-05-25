import fetch from 'node-fetch';
import fs from 'fs';
import { wsr } from './wsr';

export class ChampionCache {
    public readonly champions: string[] = [];
    public readonly skins: { name: string, champion: string }[] = [];
    async requestOrLoadData(): Promise<void> {
        let parsedChampionsFile: any;
        if (fs.existsSync('champions.json')) {
            parsedChampionsFile = JSON.parse(fs.readFileSync('champions.json', 'utf8'));
        }
        const version = (await fetch('https://ddragon.leagueoflegends.com/api/versions.json').then(res => res.json()))[0];
        if (parsedChampionsFile?.version == version) {
            console.log('Loading champions.json');
            this.champions.push(...parsedChampionsFile.champions)
            this.skins.push(...parsedChampionsFile.skins)
        } else {
            const champions = Object.keys((await fetch(`http://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`).then(res => res.json())).data);
            for (const champ of champions) {
                const skins = (await fetch(`http://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${champ}.json`).then(res => res.json())).data[champ].skins.slice(1).map(s => s.name);
                this.skins.push(...skins.map(s => ({ name: s, champion: champ })));
            }
            this.champions.push(...champions);
            fs.writeFileSync('champions.json', JSON.stringify({ version, champions, skins: this.skins }, null, 2), 'utf8');
            console.log('Updated champions.json');
        }
    }

    getSkinFromString(str: string) {
        return this.skins.find(s => wsr(s.name) == str)?.name;
    }

    getChampionFromString(str: string) {
        return this.skins.find(s => wsr(s.name) == str)?.champion ?? this.champions.find(c => wsr(c) == str);
    }
}