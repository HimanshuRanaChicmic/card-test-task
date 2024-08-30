/* eslint-disable eqeqeq */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-console */

'use strict';

const MODELS = require('../models');
const { DATABASE_VERSIONS } = require('../utils/constants');

const dbMigrations = {};

/**
 * Function to run migrationsfor database based on version number.
 * @returns
 */
dbMigrations.migerateDatabase = async () => {

	let dbVersion = await MODELS.dbVersionModel.findOne({});

	if (!dbVersion) {
		dbVersion = 0;
	}

	if (!dbVersion || dbVersion.version < DATABASE_VERSIONS.ONE) {
		await MODELS.blockChainDataModel.findOneAndUpdate({}, {
			latestInternalBlock: 0,
			latestOpenseaBlock: 0,
			latestSocketBlock: 0,
			latestBId: 100,
		}, { upsert: true, new: true });
		
		dbVersion = await MODELS.dbVersionModel
			.findOneAndUpdate({}, { version: DATABASE_VERSIONS.ONE }, { upsert: true, new: true });
	}
};

module.exports = dbMigrations;
