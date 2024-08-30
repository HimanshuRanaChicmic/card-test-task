/* eslint-disable consistent-return */
/* eslint-disable no-use-before-define */

'use strict';

const swaggerUI = require('swagger-ui-express');
const Joi = require('joi');
const path = require('path');
const multer = require('multer');
const SERVICES = require('../services');
const CONFIG = require('../../config');
const { MESSAGES, ERROR_TYPES, AVAILABLE_AUTHS } = require('./constants');
const HELPERS = require('../helpers');
const utils = require('./utils');

const uploadMiddleware = multer();

const routeUtils = {};


/**
 * function to create routes in the express.
 */
routeUtils.route = async (app, routes = [], isSwaggerWrite) => {
	routes.forEach((route) => {
		let middlewares = [];
  
		if (route.joiSchemaForSwagger.formData) {
			const multerMiddleware = getMulterMiddleware(route.joiSchemaForSwagger.formData);
			middlewares = [ multerMiddleware ];
		}
		middlewares.push(getValidatorMiddleware(route));
		if (route.auth === AVAILABLE_AUTHS.USER) {
			if (route.continueWithoutToken) {
				middlewares.push(SERVICES.authService.userValidate(route.continueWithoutToken));
			} else {
				middlewares.push(SERVICES.authService.userValidate());
			}
		}
		else if (route.auth === AVAILABLE_AUTHS.ADMIN) {
			if (route.continueWithoutToken) {
				middlewares.push(SERVICES.authService.adminValidate(route.continueWithoutToken));
			} else {
				middlewares.push(SERVICES.authService.adminValidate());
			}
		}

		middlewares.push(SERVICES.authService.validateUserOrApiKey());

		app.route(route.path)[route.method.toLowerCase()](...middlewares, getHandlerMethod(route));
	});
	createSwaggerUIForRoutes(app, routes, isSwaggerWrite);
};
  

/**
* function to check the error of all joi validations
* @param {*} joiValidatedObject
*/
const checkJoiValidationError = (joiValidatedObject) => {
	if (joiValidatedObject.error) throw joiValidatedObject.error;
};

/**
* function to validate request body/params/query/headers with joi schema to validate a request is valid or not.
* @param {*} route
*/
const joiValidatorMethod = async (request, route) => {
	if (route.joiSchemaForSwagger.params && Object.keys(route.joiSchemaForSwagger.params).length) {
		request.params = await Joi.object(route.joiSchemaForSwagger.params).validate(request.params);
		checkJoiValidationError(request.params);
	}
	if (route.joiSchemaForSwagger.body && Object.keys(route.joiSchemaForSwagger.body).length) {
		request.body = await Joi.object(route.joiSchemaForSwagger.body).validate(request.body);
		checkJoiValidationError(request.body);
	}
	if (route.joiSchemaForSwagger.query && Object.keys(route.joiSchemaForSwagger.query).length) {
		request.query = await Joi.object(route.joiSchemaForSwagger.query).validate(request.query);
		checkJoiValidationError(request.query);
	}
	if (route.joiSchemaForSwagger.headers && Object.keys(route.joiSchemaForSwagger.headers).length) {
		const headersObject = await Joi.object(route.joiSchemaForSwagger.headers).unknown(true).validate(request.headers);
		checkJoiValidationError(headersObject);
		request.headers.authorization = ((headersObject || {}).value || {}).authorization;
	}
	if (route.joiSchemaForSwagger.formData
        && route.joiSchemaForSwagger.formData.body
        && Object.keys(route.joiSchemaForSwagger.formData.body).length) {
		multiPartObjectParse(route.joiSchemaForSwagger.formData.body, request);
		request.body = await Joi.object(route.joiSchemaForSwagger.formData.body).validate(request.body);
		checkJoiValidationError(request.body);
	}
};

/**
*  Parse the object recived in multipart data request
* @param {*} formBody
* @param {*} request
*/
const multiPartObjectParse = (formBody, request) => {
	let invalidKey;
	try {
		Object.keys(formBody)
			.filter((key) => [ 'object', 'array' ].includes(formBody[key].type))
			.forEach((objKey) => {
				invalidKey = objKey;
				if (typeof request.body[objKey] === 'string') request.body[objKey] = JSON.parse(request.body[objKey]);
			});
	} catch (err) {
		throw new Error(`${invalidKey} must be of type object`);
	}
};

/**
* middleware to validate request body/params/query/headers with JOI.
* @param {*} route
*/
const getValidatorMiddleware = (route) => (request, response, next) => {
	joiValidatorMethod(request, route).then(() => next()).catch((err) => {
		const error = utils.convertErrorIntoReadableForm(err);
		const responseObject = HELPERS.createErrorResponse(error.message.toString(), ERROR_TYPES.BAD_REQUEST);
		return response.status(responseObject.statusCode).json(responseObject);
	});
};

/**
*  middleware to  to handle the multipart/form-data
* @param {*} formData
*/
const getMulterMiddleware = (formData) => {
	// for multiple files
	if (formData.files && Object.keys(formData.files).length) {
		const fileFields = [];
		const keys = Object.keys(formData.files);
		keys.forEach((key) => {
			fileFields.push({ name: key, maxCount: formData.files[key] });
		});
		return uploadMiddleware.fields(fileFields);
	}
	// for single file
	if (formData.file && Object.keys(formData.file).length) {
		const fileField = Object.keys(formData.file)[0];
		return uploadMiddleware.single(fileField);
	}
	// for file array in single key
	if (formData.fileArray && Object.keys(formData.fileArray).length) {
		const fileField = Object.keys(formData.fileArray)[0];
		return uploadMiddleware.array(fileField, formData.fileArray[fileField].maxCount);
	}
};

/**
* middleware
* @param {*} handler
*/
const getHandlerMethod = (route) => {
	const { handler } = route;
	return (request, response) => {
		let payload = {
			...((request.body || {}).value || {}),
			...((request.params || {}).value || {}),
			...((request.query || {}).value || {}),
			file: (request.file || {}),
			user: (request.user ? request.user : {}),
		};
		// request handler/controller
		if (route.getExactRequest) {
			request.payload = payload;
			payload = request;
		}
		handler(payload)
			.then((result) => {
				if (result.filePath) {
					const filePath = path.resolve(`${__dirname}/../${result.filePath}`);
					return response.status(result.statusCode).sendFile(filePath);
				}
				if (result.fileData) {
					response.attachment(result.fileName);
					response.send(result.fileData.Body);
					return response;
				}
				if (result.redirectUrl) {
					return response.redirect(result.redirectUrl);
				}
				if (result.statusCode) {
					response.status(result.statusCode).json(result);
				} else {
					response.json(result);
				}
			})
			.catch((err) => {
				console.log('Error is ', err);
				request.body.error = {};
				request.body.error.message = err.message;
				if (!err.statusCode && !err.status) {
					err = HELPERS.createErrorResponse(MESSAGES.SOMETHING_WENT_WRONG, ERROR_TYPES.INTERNAL_SERVER_ERROR);
				}
				response.status(err.statusCode).json(err);
			});
	};
};

/**
 * function to create Swagger UI for the available routes of the application.
 * @param {*} app Express instance.
 * @param {*} routes Available routes.
 */
const createSwaggerUIForRoutes = (app, routes = [], isSwaggerWrite) => {

	if(isSwaggerWrite){
		const swaggerInfo = CONFIG.swagger.info;
		const swJson = SERVICES.swaggerService;
		swJson.swaggerDoc.createJsonDoc(swaggerInfo);
		routes.forEach((route) => {
			swJson.swaggerDoc.addNewRoute(route.joiSchemaForSwagger, route.path, route.method.toLowerCase());
		});
	}  
    
	const swaggerDocument = require('../../swagger.json');
	app.use('/documentation', swaggerUI.serve, swaggerUI.setup(swaggerDocument));
};

module.exports = routeUtils;
