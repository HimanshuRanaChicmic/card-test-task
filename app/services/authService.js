'use strict';

const CONFIG = require('../../config');
const jwt = require('jsonwebtoken');
const { createErrorResponse } = require('../helpers');
const { sessionModel } = require('../models');
const {
	MESSAGES, ERROR_TYPES, TOKEN_TYPES
} = require('../utils/constants');
const CONSTANTS = require('../utils/constants');


const authService = {};

/**
 * Function to validate user of x-api-key.
 * @returns
 */
authService.validateUserOrApiKey = () => {
	return async (request, response, next) => {
		Promise.allSettled([ validateApiKey(request) ]).then((result) => {
			if (!(result?.[0]?.value || result?.[1]?.value)) {
				const responseObject = createErrorResponse(MESSAGES.UNAUTHORIZED, ERROR_TYPES.UNAUTHORIZED);
				return response.status(responseObject.statusCode).json(responseObject);
			}
			return next();
		});
	};
};


/**
 * Function to validate x-api-key.
 * @param {} request
 */
const validateApiKey = async (request) => {
	try {
		if (request.headers['x-api-key'] === CONFIG.X_API_KEY) {
			return true;
		}
		return false;
	} catch (err) {
		return false;
	}
};
/**
 * function to validate user's token and fetch its details from the system.
 * @param {} request
 */
const validateUser = async (request, authType) => {
	try {
		if (authType == CONSTANTS.AVAILABLE_AUTHS.SERVER) {
			if (CONFIG.API_KEY === '') {
				return true;
			} else {
				if (!request.headers.hasOwnProperty('x-api-key') || !request.headers['x-api-key']) {
					return false;
				}
				if (request.headers['x-api-key'] === CONFIG.API_KEY) {
					return true;
				}
			}
		} else {
			let user;
			const session = await sessionModel.findOne({ token: (request.headers.authorization), tokenType: TOKEN_TYPES.LOGIN }).lean();
			if (!session) {
				return false;
			}

			// if (session.role === CONSTANTS.USER_ROLES.USER) {
			// 	user = await userModel.findOne({ _id: session.userId }).lean();
			// }

			if (user) {
				user.session = session;
				request.user = user;
				return true;
			}
		}
		return false;

	} catch (err) {
		return false;
	}
};

/**
 * function to authenticate user.
 */
authService.userValidate = (authType) => {
	return (request, response, next) => {
		validateUser(request, authType).then((isAuthorized) => {
			if (request.user && !request.user.isActive) {
				const responseObject = createErrorResponse(MESSAGES.FORBIDDEN, ERROR_TYPES.FORBIDDEN);
				return response.status(responseObject.statusCode).json(responseObject);
			}
			if (typeof (isAuthorized) === 'string') {
				const responseObject = createErrorResponse(MESSAGES.FORBIDDEN(request.method, request.url), ERROR_TYPES.FORBIDDEN);
				return response.status(responseObject.statusCode).json(responseObject);
			}
			if (isAuthorized) {
				return next();
			}
			const responseObject = createErrorResponse(MESSAGES.UNAUTHORIZED, ERROR_TYPES.UNAUTHORIZED);
			return response.status(responseObject.statusCode).json(responseObject);
		}).catch(() => {
			const responseObject = createErrorResponse(MESSAGES.UNAUTHORIZED, ERROR_TYPES.UNAUTHORIZED);
			return response.status(responseObject.statusCode).json(responseObject);
		});
	};
};

/**
 * function to authenticate admin.
 */
authService.adminValidate = (continueWithoutToken = false) => {
	return (request, response, next) => {
		if (continueWithoutToken && !request.headers.authorization) {
			return next();
		}

		validateAdmin(request)
			.then((isAuthorized) => {
				if (isAuthorized) {
					return next();
				}
				const responseObject = createErrorResponse(MESSAGES.UNAUTHORIZED, ERROR_TYPES.UNAUTHORIZED);
				return response.status(responseObject.statusCode).json(responseObject);
			}).catch(() => {
				const responseObject = createErrorResponse(MESSAGES.UNAUTHORIZED, ERROR_TYPES.UNAUTHORIZED);
				return response.status(responseObject.statusCode).json(responseObject);
			});
	};
};


/**
 * function to validate admin's jwt token and fetch its details from the system.
 * @param {} request
 */
const validateAdmin = async (request) => {
	try {
		// return request.headers.authorization === SECURITY.STATIC_TOKEN_FOR_AUTHORIZATION
		const decodedToken = jwt.verify(request.headers.authorization, CONSTANTS.SECURITY.JWT_SIGN_KEY);
		const authenticatedAdmin = await adminModel.findOne({ _id: decodedToken._id }).lean();
		if (authenticatedAdmin) {
			request.user = authenticatedAdmin;
			return true;
		}
		return false;
	} catch (err) {
		// log.error("", err);
		return false;
	}
};

module.exports = authService;
