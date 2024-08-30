'use strict';

/** *********** Modules ********** */
const MONGOOSE = require('mongoose');

const { Schema } = MONGOOSE;

/** *********** Transactions Model ********** */
const transactionSchema = new Schema({
	status: { type: String },
	txType: { type: String },
	price: { type: Number },
	transactionId: { type: String },
	receiver: { type: String, default: '' },     // contract address
	sender: { type: String, default: '' }, // new owner in case of mint
	tokenId: { type: Number }, // blockchainId
	bomDetailsViewId: { type: Schema.Types.ObjectId },
	contractAddress: { type: String }

}, { timestamps: true, versionKey: false, collection: 'transactions' });

module.exports = MONGOOSE.model('transactions', transactionSchema);
