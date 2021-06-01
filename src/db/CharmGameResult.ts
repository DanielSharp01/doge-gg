import { Schema, model } from 'mongoose';

const schema = new Schema({
    summoner: String,
    startDate: Date,
    charmCast: Number,
    charmHit: Number,
});

export const CharmGameResult = model('CharmGameResult', schema);