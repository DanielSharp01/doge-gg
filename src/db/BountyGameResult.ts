import { Schema, model } from 'mongoose';

const schema = new Schema({
    enemyChampion: String,
    startDate: Date,
    players: [{ summonerName: String, score: Number, kills: Number, deaths: Number }],
});

export const BountyGameResult = model('BountyGameResult', schema);