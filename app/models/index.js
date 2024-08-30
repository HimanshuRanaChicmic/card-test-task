'use strict';

/** ******************************
 **** Managing all the models ***
 ********* independently ********
 ******************************* */
module.exports = {
	sessionModel: require('./sessionModel'),
	dbVersionModel: require('./dbVersionModel'),
	blockChainDataModel: require('./blockChainDataModel'),
	transactionsModel: require('./transactionsModel'),
	bomDetailsViewModel: require('./bomDetailsViewModel'),
};
