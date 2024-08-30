/* eslint-disable no-unused-expressions */
/* eslint-disable no-shadow */

'use strict';

const Joi = require('joi');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { ETHEREUM_ADDRESS_REGEX, ALLOWED_EXTENSIONS_FOR_PROFILE_IMAGE } = require('./constants');
const { S3_FILE_URL } = require('../../config');

const joiUtils = {};

/**
 * Extension for Joi.
 */
joiUtils.Joi = Joi.extend((Joi) => ({
	type: 'string',
	base: Joi.string(),
	messages: {
		'string.objectId': '{{#label}} must be a valid id',
		'string.emailMessage': '{{#label}} must be a valid email',
		'string.invalidTimeZone': '{{#label}} must be a valid timezone.',
		'string.ethereumAddress': '{{#label}} must be a valid ethereum addresses.',
		'string.imageUrl': '{{#label}} must be a valid image url or invalid image extension.',
	},
	rules: {
		objectId: {
			validate(value, helpers) {
				if (mongoose.Types.ObjectId.isValid(value)) {
					return mongoose.Types.ObjectId(value);
				}
				return helpers.error('string.objectId');
			},
		},
		isValidEmail: {
			validate(value, helpers) {
				const filter = /^([\w]+)(.[\w]+)*@([\w]+)(.[a-z]{2,3}){1,2}$/;
				if (filter.test(value.toLowerCase())) {
					return value.toLowerCase();
				}
				return helpers.error('string.emailMessage');
			},
		},
		ethereumAddress: {
			validate(value, helpers) {
				if (ETHEREUM_ADDRESS_REGEX.test(value.toLowerCase())) {
					return value;
				}
				return helpers.error('string.ethereumAddress');
			},
		},
		isValidTimeZone: {
			validate(value, helpers) {
				if (moment.tz.zone(value)) {
					return value;
				}
				return helpers.error('string.invalidTimeZone');
			},
		},
		imageUrl: {
			validate(value, helpers) {
				const imageUrlRegex = new
				RegExp(`^(http[s]?://.*.(?:${ALLOWED_EXTENSIONS_FOR_PROFILE_IMAGE.join('|')}))$`, 'gmi');
				if (imageUrlRegex.test(value)) {
					if (value.includes(S3_FILE_URL)) return value.substring(S3_FILE_URL.length);
					return value;
				}
				return helpers.error('string.imageUrl');
			},
		},
	},
}));

joiUtils.Joi = joiUtils.Joi.extend((Joi) => ({
	type: 'date',
	base: Joi.date(),
	messages: {
		'date.dateOnly': '{{#label}} must contain only date.',
	},
	rules: {
		dateOnly: {
			validate(value, helpers) {
				if (new Date(value)) {
					const timestamp = (new Date(value || new Date())).setHours(0, 0, 0, 0);
					return new Date(timestamp);
				}
				return helpers.error('date.dateOnly');
			},
		},
	},
}));

/** functions for files in multipart/form-data * */
joiUtils.Joi.file = ({ name, description = 'File' }) => (
	{ [name]: Joi.any().meta({ swaggerType: 'file' }).optional().description(description) }
);

joiUtils.Joi.fileArray = ({ name, description = 'File', maxCount }) => {
	const joiValidation = Joi.any().meta({ swaggerType: 'file' }).optional().description(description);
	maxCount && (joiValidation.maxCount = maxCount);
	return { [name]: joiValidation };
};

joiUtils.Joi.files = ({ maxCount, description = 'File' }) => {
	const joiValidation = Joi.any().meta({ swaggerType: 'file' }).optional().description(description);
	joiValidation.maxCount = maxCount;
	return joiValidation;
};

module.exports = joiUtils;
