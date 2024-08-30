/* eslint-disable no-console */

'use strict';

/** *********************************
**** node module defined here *****
********************************** */
require('dotenv').config();
const http = require('http');
const process = require('process');
const EXPRESS = require('express');
const { SERVER } = require('./config');
const { migerateDatabase } = require('./app/utils/dbMigrations');

/** creating express server app for server. */
const app = EXPRESS();

/** ******************************
***** Server Configuration *****
******************************* */
const server = http.Server(app);

/** Server is running here */
const startNodeserver = async () => {
	const isSwaggerWrite = true;
	// initialize mongo
	await require('./app/startup/db_mongo')();

	await migerateDatabase(); // run database migrations.

	await require('./app/startup/expressStartup')(app, isSwaggerWrite); // express startup.
	return new Promise((resolve, reject) => {
		server.listen(SERVER.PORT, (err) => {
			if (err) reject(err);
			resolve();
		});
	});
};

startNodeserver().then(() => {
	console.log('Node server running on', SERVER.URL);
}).catch((err) => {
	console.log('Error in starting server', err);
	process.exit(1);
});
