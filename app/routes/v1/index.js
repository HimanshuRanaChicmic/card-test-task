'use strict';

/** ******************************
 ********* Import All routes ***********
 ******************************* */
const v1Routes = [
	...require('./serverRoutes'),
	...require('./nftRoutes'),
];

module.exports = v1Routes;
