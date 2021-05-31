import { Schema, model } from 'mongoose';

const schema = new Schema({
    summoner: String,
    charmCast: Number,
    charmHit: Number,
});

export const CharmGameResult = model('CharmGameResult', schema);