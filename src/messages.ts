import { StringResolvable } from 'discord.js';
import { randomInt } from './randomInt';

export type Message = string | Array<Message> | ((...params: Array<any>) => Message);

export const resolveMessage = (message: Message, ...params: Array<any>) => {
    if (typeof message == 'string') {
        return message;
    } else if (typeof message == 'function') {
        return resolveMessage(message(...params));
    } else {
        return resolveMessage(randomlyPick(message as Array<Message>));
    }
}

export const randomlyPick = (stuff: Array<any>): any => {
    return stuff[randomInt(0, stuff.length)]
}

export const generateChampVariations = (champion, messageTransformer: (name: string) => Message): Array<Message> => {
    return [champion, ...championAliases[champion]].map(messageTransformer);
}

export const championAliases: { [key: string]: Array<string> } = {
    'Ahri': ['the foxy lady', 'the feisty fox', 'a charming fox', 'one cunning fox', 'the sly vixen', 'the :fox:'],
    'Teemo': ['the devil himself :smiling_imp:', 'a rat thing (that is not twitch)', 'tiny devil'],
    'Veigar': ['tiny Dumbledore', 'the rat in a hat :tophat:', 'a tiny mage', 'the one with a win fight button'],
    'Sett': ['Bunyós Pityu'],
    'Hecarim': ['Rainbow Battlepony'],
    'Lux': ['Miss titty laser'],
    'Lucian': ['Obama'],
    'Senna': ['Yee-Haaaaa', 'Obama\'s wife'],
    'Sona': ['*silence*', 'Sona 1.0'],
    'Seraphine': ['Bell Delphine', 'Sona 2.0', 'floating bath water distributor'],
    'Lillia': ['Bambi', 'the colorful caribou', 'the :deer:', 'the coked up caribou', 'dream dust dealer'],
};

export const bountyLines: { [key: string]: Array<string> } = {
    'Teemo': ['invites pest control to deal with the biggest rat of them all :skull_crossbones:'],
    'Lillia': ['you monster, who would want to hurt Bambi :sob:'],
};

export const killLines: { [key: string]: (...params: Array<any>) => Message } = {
    'Teemo': summoner => [`Good riddance. Congrats ${summoner}! :ok_hand:`],
    'Lillia': summoner => [`${summoner} you monster, who would want to hurt Bambi :sob:`],
};

export const deathLines: { [key: string]: (...params: Array<any>) => Message } = {
    'Ahri': summoner => [...generateChampVariations('Ahri', champion => `${summoner} got charmed by ${champion} :heart:`)],
    'Teemo': summoner => [`Report ${summoner}`],
    'Lillia': summoner => [`Sleep well dream better ${summoner} :sleeping:`],
};

export const aliasChampion = (champion: string, aliasUsage = 0.25) => {
    return (championAliases[champion] && Math.random() < aliasUsage) ? randomlyPick(championAliases[champion]) : champion;
};

export const summonerSuccessfulMessage = (summonerName: string) => {
    return randomlyPick([
        `All set ${summonerName}`,
        `Got it ${summonerName}`,
        `Nice name ${summonerName}`,
        `Noted ${summonerName}`,
        `Hello ${summonerName}`,
        `Catchy ${summonerName}`,
    ]) + ' :thumbsup:';
}

export const setOutBountyMessage = (champion: string) => {
    if (bountyLines[champion] && Math.random() < 0.25) {
        return randomlyPick(bountyLines[champion]);
    }
    return `has set out a bounty on ${aliasChampion(champion)} :coin:`
}

export const bountyErrorNoChampMessage = (champion: string) => {
    return `:x: Could not set bounty on ${champion} as they are not in the enemy :rolling_eyes:`;
}

export const bountyErrorNoGameMessage = () => {
    return `:x: Could not set bounty the game is not even running (at least not for the bot host) :rolling_eyes:`;
}

export const killMessage = (name: string, champion: string) => {
    if (killLines[champion] && Math.random() < 0.25) {
        return resolveMessage(killLines[champion](name));
    }
    return `${name} killed ${aliasChampion(champion)}`;
}

export const deathMessage = (name: string, champion: string) => {
    if (deathLines[champion] && Math.random() < 0.25) {
        return resolveMessage(deathLines[champion](name));
    }
    return `${name} died to ${aliasChampion(champion)}`;
}

export const winnerMessage = (winners: Array<string>, winnerScore) => {
    const winner = winners.length > 1 ? winners.slice(0, winners.length - 1).join(', ') + ' and ' + winners[winners.length - 1] : winners[0];
    const negativeVariations = [
        `A win is a win but next time you can die a bit less ${winner} :rolling_eyes:`,
        `A little bit sad to hand it to ${winner} for that performance :rolling_eyes:`,
        `You were bad but everyone else was worse ${winner} :rolling_eyes:`,
    ];
    const zeroVariations = [
        `Slow and steady wins the wins the race. In ${winner}'s case slow means don't move :upside_down:`,
        `Anticlimactic victory for ${winner} :yawning_face:`,
        `Zero but still the best ${winner} :man_shrugging:`
    ];
    const positiveVariations = [
        `${winner} diff :uspide_down:`,
        `Fierce battle won by ${winner} :smile:`,
        `GG ${winner} :ok_hand:`
    ];
    const negativeTieVariations = [
        `${winner} you are both equally bad :man_facepalming:`,
        `${winner} being still better than everybody :man_shrugging:`,
        `${winner} both had sad but winning performances :man_shrugging:`,
    ];
    const zeroTieVariations = [
        `You both are rock solid in not getting any points ${winner} :upside_down:`,
        `The winning startegy for ${winner} is not to play :upside_down:`,
        `Zero but still the best for ${winner} :no_mouth:`,
    ];
    const positiveTieVariations = [
        `In join first place ${winner} :partying_face:`,
        `Fierce battle won by both ${winner} :muscle:`,
        `GG ${winner} :ok_hand:`
    ];

    const totalTieVariation = [
        `Do I really have to declare a winner? :rolling_eyes:`,
        `How about nobody won? :thinking:`,
        `Well that was eventful :neutral_face:`,
    ]

    if (winners.length === 5) {
        return randomlyPick(totalTieVariation);
    } else if (winnerScore < 0) {
        if (winners.length > 1) return randomlyPick(negativeTieVariations);
        return randomlyPick(negativeVariations);
    } else if (winnerScore === 0) {
        if (winners.length > 1) return randomlyPick(zeroTieVariations);
        return randomlyPick(zeroVariations);
    } else {
        if (winners.length > 1) return randomlyPick(positiveTieVariations);
        return randomlyPick(positiveVariations);
    }
}