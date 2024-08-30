'use strict';

/** *********** Modules ********** */
const MONGOOSE = require('mongoose');

const { Schema } = MONGOOSE;

/** *********** BOM details view Model ********** */
const bomDetailsViewSchema = new Schema({
	identifier: { type: String },
	metaDataUri: { type: String },
	tokenId: { type: Number }, // blockchainId
	productInfo: {
		itemNo: { type: String },
		itemName: { type: String },
		serialNumber: { type: String },
		itemWeight: { type: String },
		metalType: { type: String },
		metalQuality: { type: String },
		description: { type: String },
		year: { type: Number },
		imageUrl: { type: String },
		mintMark: { type: String },
		purity: { type: String },
		manufacturer: { type: String },
		thickness: { type: String },
		diameter: { type: String },
		condition: { type: String },
		issuingCountry: { type: String },
		obverseDesigner: { type: String },
		reverseDesigner: { type: String },
		edgeDesign: { type: String },
		series: { type: String },
		coa: { type: String },
		packagingType: { type: String },
		metalWeight: { type: String },
	}, 

	
	status: { type: String },

}, { timestamps: true, versionKey: false, collection: 'bomDetailsView' });

module.exports = MONGOOSE.model('bomDetailsView', bomDetailsViewSchema);
