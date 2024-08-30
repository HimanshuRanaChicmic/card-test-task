/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable no-console */

'use strict';

const fs = require('fs');
const pino = require('pino');
const BCRYPT = require('bcrypt');
const JWT = require('jsonwebtoken');
const MONGOOSE = require('mongoose');
const { createPinoBrowserSend, createWriteStream } = require('pino-logflare');
const handlebars = require('handlebars');
const CONSTANTS = require('./constants');
const CONFIG = require('../../config');
const AWS = require('aws-sdk');
const AWS_SES = new AWS.SES(CONFIG.SES);
const WEB3 = require('web3');

console.log(new WEB3().utils.isAddress('0xd2467a5F2095b40329585A43Abd08FaDa12E6373'));
const crypto = require('crypto');
const axios = require('axios');

const {
	PINO, LIVE_LOGGER_ENABLE,
} = require('../../config');

const PINO_CRED = { apiKey: PINO.API_KEY, sourceToken: PINO.API_SECRET };

const stream = createWriteStream(PINO_CRED); // create pino-logflare stream
const send = createPinoBrowserSend(PINO_CRED); // create pino-logflare browser stream

const commonFunctions = {};

/**
 * incrypt password in case user login implementation
 * @param {*} payloadString
 */
commonFunctions.hashPassword = (payloadString) => BCRYPT.hashSync(payloadString, CONSTANTS.SECURITY.BCRYPT_SALT);

/**
 * @param {string} plainText
 * @param {string} hash
 */
commonFunctions.compareHash = (payloadPassword, userPassword) => BCRYPT.compareSync(payloadPassword, userPassword);

/**
 * function to get array of key-values by using key name of the object.
 */
commonFunctions.getEnumArray = (obj) => Object.keys(obj).map((key) => obj[key]);

/**
 * used for converting string id to mongoose object id
 */
commonFunctions.convertIdToMongooseId = (stringId) => MONGOOSE.Types.ObjectId(stringId);

/** used for comare mongoose object id */
commonFunctions.matchMongoId = (id1, id2) => id1.toString() === id2.toString();

/**
 * create jsonwebtoken
 */
commonFunctions.encryptJwt = (payload, expTime = '365d') => JWT.sign(payload, CONSTANTS.SECURITY.JWT_SIGN_KEY, { algorithm: 'HS256' }, { expTime: expTime });

/**
 * decrypt jsonwebtoken
 */
commonFunctions.decryptJwt = (token) => JWT.verify(token, CONSTANTS.SECURITY.JWT_SIGN_KEY, { algorithm: 'HS256' });

/**
 * function to convert an error into a readable form.
 * @param {} error
 */
commonFunctions.convertErrorIntoReadableForm = (error) => {
	let errorMessage = '';
	if (error.message.indexOf('[') > -1) {
		errorMessage = error.message.substr(error.message.indexOf('['));
	} else {
		errorMessage = error.message;
	}
	errorMessage = errorMessage.replace(/"/g, '');
	errorMessage = errorMessage.replace('[', '');
	errorMessage = errorMessage.replace(']', '');
	error.message = errorMessage;
	return error;
};

/**
 * Logger for error and success
 */
commonFunctions.log = {
	info: (data) => {
		console.log(`\x1b[33m${data}`, '\x1b[0m');
	},
	success: (data) => {
		console.log(`\x1b[32m${data}`, '\x1b[0m');
	},
	error: (data) => {
		console.log(`\x1b[31m${data}`, '\x1b[0m');
	},
	default: (data) => {
		console.log(data, '\x1b[0m');
	},
};

/**
 * function to get pagination condition for aggregate query.
 * @param {*} sort
 * @param {*} skip
 * @param {*} limit
 */
commonFunctions.getPaginationConditionForAggregate = (sort, skip, limit) => {
	const condition = [
		...(sort ? [ { $sort: sort } ] : []),
		{ $skip: skip },
		{ $limit: limit },
	];
	return condition;
};

/**
 * Function to send email from aws
 * @param {*} userData 
 * @param {*} type 
 * @returns 
 */
commonFunctions.sendEmailViaAWS = async (userData, subject, template) => {
	const params = {
		Source: CONFIG.SES.SENDER,
		Destination: {
			ToAddresses: [
				userData.email
			],
		},
		Message: {
			Body: {
				Html: {
					Charset: 'UTF-8',
					Data: template,
				},
			},
			Subject: {
				Charset: 'UTF-8',
				Data: subject,
			}
		},
	};

	return AWS_SES.sendEmail(params).promise();
};

/**
 * Send an email to perticular user mail
 * @param {*} email email address
 * @param {*} subject  subject
 * @param {*} content content
 * @param {*} cb callback
 */
commonFunctions.sendEmail = async (userData, type) => {

	const transporter = require('nodemailer').createTransport(CONFIG.SMTP.TRANSPORT);
	const handleBars = require('handlebars');
  
	userData.baseURL = CONFIG.CLIENT_URL;
	/** setup email data with unicode symbols **/
	const mailData = commonFunctions.emailTypes(userData, type),
		email = userData.email;
	mailData.template = fs.readFileSync(mailData.template, 'utf-8');
	const template = handleBars.compile(mailData.template);
  
	const result = template(mailData.data);
  
	const emailToSend = {
		to: email,
		from: CONFIG.SMTP.SENDER,
		subject: mailData.Subject,
		html: result,
	};
	return await transporter.sendMail(emailToSend);
};
  
commonFunctions.emailTypes = (user, type) => {
	const EmailStatus = {
		Subject: '',
		data: {},
		template: '',
	};
	switch (type) {
	case CONSTANTS.EMAIL_TYPES.RESET_PASSWORD_EMAIL:
		EmailStatus['Subject'] = CONSTANTS.EMAIL_SUBJECTS.RESET_PASSWORD_EMAIL;
		EmailStatus.template = CONSTANTS.EMAIL_CONTENTS.RESET_PASSWORD_EMAIL;
		EmailStatus.data['name'] = user.name;
		EmailStatus.data['link'] = user.resetPasswordLink;
		EmailStatus.data['baseURL'] = user.baseURL;
		break;
  
	case CONSTANTS.EMAIL_TYPES.EMAIL_VERIFICATION:
		EmailStatus['Subject'] = CONSTANTS.EMAIL_SUBJECTS.EMAIL_VERIFICATION;
		EmailStatus.template = CONSTANTS.EMAIL_CONTENTS.EMAIL_VERIFICATION_TEMPLATE;
		EmailStatus.data['name'] = user.name;
		EmailStatus.data['emailVerificationLink'] = user.emailVerificationLink;
		EmailStatus.data['baseURL'] = user.baseURL;
		break;
  
	case CONSTANTS.EMAIL_TYPES.SETUP_PASSWORD:
		EmailStatus['Subject'] = CONSTANTS.EMAIL_SUBJECTS.SETUP_PASSWORD;
		EmailStatus.template = CONSTANTS.EMAIL_CONTENTS.SETUP_PASSWORD_EMAIL_TEMPLATE;
		EmailStatus.data['name'] = user.name;
		EmailStatus.data['link'] = user.setupPasswordLink;
		EmailStatus.data['baseURL'] = user.baseURL;
		break;
  
	case CONSTANTS.EMAIL_TYPES.NEWSLETTER_EMAIL:
		EmailStatus['Subject'] = user.title;
		EmailStatus.template = CONSTANTS.EMAIL_CONTENTS.NEWSLETTER_EMAIL_TEMPLATE;
		EmailStatus.data['text'] = user.text;
		EmailStatus.data['baseURL'] = user.baseURL;
		break;
  
	case CONSTANTS.EMAIL_TYPES.NEW_CASINO_ADDED:
		EmailStatus['Subject'] = user.title;
		EmailStatus.template = CONSTANTS.EMAIL_CONTENTS.NEW_CASINO_ADDED_EMAIL_TEMPLATE;
		EmailStatus.data['newCasinoLink'] = user.newCasinoLink;
		EmailStatus.data['casinoImagePath'] = user.casinoImagePath;
		EmailStatus.data['baseURL'] = user.baseURL;
		break;
  
	case CONSTANTS.EMAIL_TYPES.MANAGER_CREATED:
		EmailStatus['Subject'] = CONSTANTS.EMAIL_SUBJECTS.MANAGER_CREATED;
		EmailStatus.template = CONSTANTS.EMAIL_CONTENTS.MANAGER_CREATED;
		EmailStatus.data['name'] = user.name;
		EmailStatus.data['email'] = user.email;
		EmailStatus.data['password'] = user.password;
		EmailStatus.data['mobile'] = user.mobile;
		break;
      
	case CONSTANTS.EMAIL_TYPES.OPERATOR_CREATED:
		EmailStatus['Subject'] = CONSTANTS.EMAIL_SUBJECTS.OPERATOR_CREATED;
		EmailStatus.template = CONSTANTS.EMAIL_CONTENTS.OPERATOR_CREATED;
		EmailStatus.data['name'] = user.name;
		EmailStatus.data['email'] = user.email;
		EmailStatus.data['password'] = user.password;
		EmailStatus.data['mobile'] = user.mobile;
		break;
  
	default:
		EmailStatus['Subject'] = 'Welcome Email!';
		break;
	}
	return EmailStatus;
};

/**
 * function to make email template dynamic.
 */
commonFunctions.renderTemplate = (template, data) => handlebars.compile(template)(data);

/**
 * function to create reset password link.
 */
commonFunctions.createResetPasswordLink = (userData) => {
	const dataForJWT = { ...userData, Date: Date.now };
	const resetPasswordLink = CONFIG.CLIENT_URL + '/auth/reset-password/' + commonFunctions.encryptJwt(dataForJWT, '1h');
	return resetPasswordLink;
};

/**
 * function to generate random otp string
 */
commonFunctions.generateOTP = (length) => {
	const chracters = '0123456789';
	let randomString = '';
	for (let i = length; i > 0; --i) { randomString += chracters[Math.floor(Math.random() * chracters.length)]; }

	return randomString;
};

/**
 * function to returns a random number between min and max (both included)
 */
commonFunctions.getRandomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Function to generate expiry time in seconds
 */
commonFunctions.generateExpiryTime = (seconds) => new Date(new Date().setSeconds(new Date().getSeconds() + seconds));

/**
 * function to convert seconds in HMS string
 */
commonFunctions.convertSecondsToHMS = (value) => {
	const sec = parseInt(value, 10);
	const hours = Math.floor(sec / 3600);
	const minutes = Math.floor((sec - (hours * 3600)) / 60);
	const seconds = sec - (hours * 3600) - (minutes * 60);
	let str = '';
	if (hours) str = str + hours + (hours > 1 ? ' Hours' : ' Hour');
	if (minutes) str = `${str} ${minutes}${minutes > 1 ? ' Minutes' : ' Minute'}`;
	if (seconds) str = `${str} ${seconds}${seconds > 1 ? ' Seconds' : ' Second'}`;

	return str.trim();
};

/**
 * Variable to create logging
 */
commonFunctions.logger = (() => {
	if (LIVE_LOGGER_ENABLE) {
		return pino({
			browser: {
				transmit: {
					send,
				},
			},
		}, stream);
	}

	if (!fs.existsSync('./error.log')) {
		fs.writeFileSync('./error.log', '');
	}
	return pino(pino.destination('./error.log'));
})();

/**
* function to add time
*/
commonFunctions.addMinutesToDate = (date, minutes) => {
	return new Date(date.getTime() + minutes * 60000);
};

commonFunctions.generateReferralCode = () => {
	let code = '';
	// without zero or 'O'  
	const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
	const charactersLength = characters.length;
	for (let i = 0; i < CONSTANTS.REFERRAL_CODE_LENGTH; i++) {
		code += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return code;
};

/** 
 * function to generate random password
 */
commonFunctions.generatePassword = () => {
	const numLc = 4;
	const numUc = 2;
	const numDigits = 2;
	const numSpecial = 1;

	const lowerCaseLetter = 'abcdefghijklmnopqrstuvwxyz';
	const uperCaseLetter = lowerCaseLetter.toUpperCase();
	const numbers = '0123456789';
	const special = '!?=#*$@+-';

	const pass = [];
	for (let i = 0; i < numLc; ++i) { pass.push(commonFunctions.getRandom(lowerCaseLetter)); }
	for (let i = 0; i < numUc; ++i) { pass.push(commonFunctions.getRandom(uperCaseLetter)); }
	for (let i = 0; i < numDigits; ++i) { pass.push(commonFunctions.getRandom(numbers)); }
	for (let i = 0; i < numSpecial; ++i) { pass.push(commonFunctions.getRandom(special)); }

	return commonFunctions.shuffle(pass).join('');

};

commonFunctions.getRandom = function (values) {
	return values.charAt(Math.floor(Math.random() * values.length));
};

commonFunctions.shuffle = function (o) {
	for (let j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
};

commonFunctions.timeStampDiffernceInSeconds = (t1, t2) => {
	const result = Math.floor(Math.abs(+t1 - (+t2)) / 1000);
	return result;
};

/*
* Function to multiply two strings
*/
commonFunctions.multiplyString = (num1, num2) => {
	const len1 = num1.length;
	const len2 = num2.length;
	const res = Array(len1 + len2).fill(0);
	let carry = 0;
	let val = 0;
	let index = 0;

	for (let i = len1 - 1; i >= 0; i--) {
		carry = 0;
		for (let j = len2 - 1; j >= 0; j--) {
			index = len1 + len2 - 2 - i - j;
			val = (num1[i] * num2[j]) + carry + res[index];
			carry = Math.floor(val / 10);
			res[index] = val % 10;
		}
		if (carry) res[index + 1] = carry;
	}

	while (res.length > 1 && res[res.length - 1] === 0) res.pop();

	return res.reverse().join('');
};

/*
Function for encodeing upperCase string to number
*/
commonFunctions.encodeString = (string) => {
	let encodedRefrral = 0;
	for (let i = 0; i < string.length; i++) {
		encodedRefrral *= 100;
		encodedRefrral += string.charCodeAt(i);
	}
	return encodedRefrral;
};

/*
Function for decoding number to upperCase string
*/
commonFunctions.decodeNumberString = (encodedNumber) => {
	const decodedStringLength = encodedNumber.toString().length / 2;
	let output = '';
	let num = encodedNumber;

	for (let i = 0; i < decodedStringLength; i++) {
		const charCode = num / Math.pow(100, decodedStringLength - 1 - i);
		num = num % Math.pow(100, decodedStringLength - 1 - i);
		output += String.fromCharCode(charCode);
	}
	return output;
};

/**
 * Function to get the array of year and month of any table form the database.
 */
commonFunctions.getYearMonthAggregation = (criteria = {}) => {
	return [
	  { $match: criteria },
	  { $group: { _id: { 'year': { '$substr': [ '$createdAt', 0, 4 ] }, 'month': { '$substr': [ '$createdAt', 5, 2 ] } } } },
	  {
			$addFields: {
		  monthName: {
					$let: {
			  vars: {
							monthsInString: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
							month: { $toInt: '$_id.month' }
			  },
			  in: {
							$arrayElemAt: [ '$$monthsInString', '$$month' ]
			  }
					}
		  }
			}
	  },
	  { $project: { monthName: 1, _id: 0, year: '$_id.year', month: '$_id.month' } },
	  { $sort: { year: -1, month: -1 } }
	];
};
  

commonFunctions.formatNumber = (number) => {
	if (isNaN(number)) {
		return number;
	}
	number = Number(number);
	number = Number.isInteger(number) ? number : number.toFixed(2);
	const localeCode = 'en-US';
	return number.toLocaleString(localeCode);
};


commonFunctions.replaceAll = async (obj, dynamicValues, visited = new Set()) => {
	for (const key in obj) {
	  if (typeof obj[key] === 'object') {
			if (!visited.has(obj[key])) {
		  visited.add(obj[key]);
		  await commonFunctions.replaceAll(obj[key], dynamicValues, visited);
			}
	  } else if (typeof obj[key] === 'string') {
			Object.keys(dynamicValues).forEach((dynamicKey) => {
		  const regex = new RegExp(`{{${dynamicKey}}}`, 'g');
		  obj[key] = obj[key].replace(regex, dynamicValues[dynamicKey]);
			});
	  }
	}
};

commonFunctions.convertToAppropriateUnit = (value) => {
	const numZeros = Math.floor(Math.log10(value));
	if (numZeros >= 6 && numZeros < 9) {
		const result = value / 1000000;
		return Math.round(result) + 'M';
	} else if (numZeros >= 9 && numZeros < 12) {
		const result = value / 1000000000;
		return Math.round(result) + 'B';
	} else if (numZeros >= 12) {
		const result = value / 1000000000000;
		return Math.round(result) + 'T';
	} else {
		return commonFunctions.formatNumber(value);
	}
};

/**
 * Function to hit Third party api's.
 */
commonFunctions.callThirdPartyAPI = {
	post: async ({ API = '', DATA = {}, HEADER = {} }) => {
		return axios.post(API, DATA, { headers: HEADER });
	},
	get: async ({ API = '', PARAMS = {}, HEADER = {}, responseType = 'json' }) => {
		return axios.get(API, { params: PARAMS, headers: HEADER, responseType });
	},
	put: async ({ API = '', DATA = {}, HEADER = {} }) => {
		return axios.put(API, DATA, { headers: HEADER });
	},
	delete: async ({ API = '', DATA = {}, HEADER = {} }) => {
		return axios.delete(API, DATA, { headers: HEADER });
	},
	patch: async ({ API = '', DATA = {}, HEADER = {} }) => {
		return axios.patch(API, DATA, { headers: HEADER });
	}
};

/**
 * Calculates the difference in days between two dates.
 *
 * @param {Date} date1 - The first date.
 * @param {Date} date2 - The second date.
 * @return {number} The difference in days between the two dates.
 */
commonFunctions.differenceInDays = (date1, date2) => {
	// Get the time values in milliseconds
	const time1 = date1.getTime();
	const time2 = date2.getTime();

	// Calculate the difference in milliseconds
	const differenceInMilliseconds = Math.abs(time2 - time1);

	// Convert milliseconds to days (1 day = 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
	const differenceInDays = differenceInMilliseconds / CONSTANTS.MATHEMATICAL.MILLISECONDS_IN_A_DAY;

	return differenceInDays;
};

/**
 * Compare signature and owner's public key.
 *
 * @param {type} signature - The signature to validate.
 * @param {type} publicKey - The public key to compare.
 * @return {boolean} Whether the public key matches the owner's public address.
 */
commonFunctions.validateWallet = (publicKey) => {
	return publicKey === CONFIG.SOLANA.CONTRACT_OWNER_PUBLIC_ADDRESS;
};
commonFunctions.convertUserIdToAuthString = async (objectId) => {
	return crypto.createHash('sha256').update(objectId + Date.now()).digest('hex');
};

commonFunctions.batchTranslate = async (texts, targetLanguage, authKey) => {
	const response = (
		await commonFunctions.callThirdPartyAPI.post({
			API: 'https://api.deepl.com/v2/translate',
			DATA:
			{
				'target_lang': targetLanguage,
				'tag_handling': 'html',
				'method': 'getProgramAccounts',
				'text': texts
			}
			,
			HEADER: {
				'Authorization': `DeepL-Auth-Key ${authKey}`,
				'Content-Type': 'application/json'
			},
		})
	);

	return response.data.translations.map((translation) => translation.text);
};

commonFunctions.extract= async (obj, isObject, language) => {
	const dataToCreate = isObject ? {} : [];

	for (const key in obj) {

		if (typeof obj[key] === 'object' && key !== '_id') {
			dataToCreate[key] = await commonFunctions.extract(obj[key], !Array.isArray(obj[key]), language);
		} else if(typeof obj[key] === 'boolean') {
			dataToCreate[key] = obj[key];
		}
		else if (typeof obj[key] === 'string' && key != '_bsontype') {

			const translatedString = (await commonFunctions.batchTranslate([ obj[key] ], language, CONFIG.DEEPL_API_KEY  ))[0];
			console.log(translatedString);
			dataToCreate[key] = translatedString;
		}
	}

	return dataToCreate;
};

commonFunctions.storeImageOnIPFS = async (url) => {
	try {
		const urlStream = await fetch(url);
		const arrayBuffer = await urlStream.arrayBuffer();
		const blob = new Blob( [ arrayBuffer ]);

		const data = new FormData();
		data.append('file', blob);
		const upload = await fetch(
			CONFIG.IPFS.IMAGE_UPLOAD_URL,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${CONFIG.IPFS.JWT_TOKEN}`
				},
				body: data,
			}
		);
		return await upload.json();
	} catch (error) {
		console.log(error);
		return false;
	}
};

commonFunctions.validateEthereumAddress = async (walletAddress) => {
	return new WEB3().utils.isAddress(walletAddress);
}
commonFunctions.pinJSONToIPFS = async (data) => {
	// return;
	try{
		const res = await axios.post(CONFIG.IPFS.JSON_TO_IPFS_URL, data, {
		  headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${CONFIG.IPFS.JWT_TOKEN}`
		  }
		});
		return res.data;
	  } catch (error) {
		console.log(error);
		return false;
	  }
};

/**
 * Function to connect to blockchain socekets
 */
commonFunctions.connectToSocketNetwork = async () => {

	const options = {

		// Useful if requests result are large
		clientConfig: {
			maxReceivedFrameSize: 100000000,   // bytes - default: 1MiB
			maxReceivedMessageSize: 100000000, // bytes - default: 8MiB
		},

		// Enable auto reconnection
		reconnect: {
			auto: true,
			delay: 5000, // ms
			maxAttempts: 10,
			onTimeout: false
		}
	};


	const web3 = new WEB3(new WEB3.providers.WebsocketProvider(CONFIG.CONTRACT_DETAILS.WS_URL, options));
	const contract = new web3.eth.Contract(require('../../abi.json'), CONFIG.CONTRACT_DETAILS.CONTRACT_ADDRESS);
	return { web3, contract };
};

module.exports = commonFunctions;
