'use strict';

/** *********** Modules ********** */
const MONGOOSE = require('mongoose');

const { Schema } = MONGOOSE;

/** *********** Blockchain data Model ********** */
const blockChainSchema = new Schema({
	latestInternalBlock: { type: Number, default: 0 },
	latestOpenseaBlock: { type: Number, default: 0 },
	latestSocketBlock: { type: Number, default: 0 },
	latestBId: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

module.exports = MONGOOSE.model('blockchaindata', blockChainSchema);
