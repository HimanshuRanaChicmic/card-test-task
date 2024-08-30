'use strict';

const CONSTANTS = require('./constants');
const { encryptJwt, generateOTP, generateExpiryTime } = require('./utils');
const { ENVIRONMENT } = require('../../config');

const { dbService } = require('../services');
const { sessionModel } = require('../models');

const dbUtils = {};

/**
* function to check valid reference from models.
*/
dbUtils.checkValidReference = async (document, referenceMapping) => {
	for (let i = 0; i < referenceMapping.length; i++) {
		const model = referenceMapping[referenceMapping[i]];
		// eslint-disable-next-line no-await-in-loop
		if (!!document[referenceMapping[i]] && !(await model.findById(document[referenceMapping[i]]))) {
			throw CONSTANTS.RESPONSE.ERROR.BAD_REQUEST(`${referenceMapping[i]} is invalid.`);
		}
	}
};

/**
 * function to create sessions
 */
dbUtils.createSession = async (payload) => {
	let sessionData = {};

	sessionData.token = encryptJwt({
		userId: payload.userId,
		date: Date.now(),
		role: payload.role,
	});

	if (payload.tokenType === CONSTANTS.TOKEN_TYPES.OTP) {
		sessionData.token = generateOTP(CONSTANTS.OTP_LENGTH);
		sessionData.tokenExpDate = generateExpiryTime(CONSTANTS.OTP_EXPIRIED_TIME_IN_SECONDS || 10);
	}

	if (ENVIRONMENT === 'development' || payload.tokenType !== CONSTANTS.TOKEN_TYPES.LOGIN) {
		sessionData = {
			...sessionData,
			userId: payload.userId,
			userType: payload.userType,
			tokenType: payload.tokenType || CONSTANTS.TOKEN_TYPES.LOGIN,
		};
		await dbService.findOneAndUpdate(sessionModel, { userId: payload.userId }, sessionData, { upsert: true });
	}
	return sessionData.token;
};

module.exports = dbUtils;
