const MESSAGES = require('../../../utils/messages');

const userData = {
	_id: '61fba617f4f70d6c0b3eff58',
	profileImage: 'default.png',
	biography: 'this is user biography in multiple line',
};

module.exports = {
	login: {
		200: {
			schema: {
				type: 'object',
				example: {
					statusCode: 200,
					message: MESSAGES.LOGGED_IN_SUCCESSFULLY,
					status: true,
					type: 'Default',
					data: userData,
					// eslint-disable-next-line max-len
					accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MWZiYTYxN2Y0ZjcwZDZjMGIzZWZmNTgiLCJlbWFpbCI6Im1hbm9qcmFuYTAyMEBnbWFpbC5jb20iLCJpYXQiOjE2NDYxMjIxMjd9.btiVzJh2hXSZdlfNAXr5dt-qGFShmoYRKjTvDr7NawA',
				},
			},
		},
		400: {
			schema: {
				type: 'object',
				example: {
					statusCode: 400,
					message: MESSAGES.INVALID_ETHEREUM_ADDRESS,
					status: false,
					type: 'BAD_REQUEST',
				},
			},
		},
	},
	updateUser: {
		200: {
			schema: {
				type: 'object',
				example: {
					statusCode: 200,
					message: MESSAGES.USER_UPDATED_SUCCESSFULLY,
					status: true,
					type: 'Default',
					data: userData,
				},
			},
		},
	},
	getProfile: {
		200: {
			schema: {
				type: 'object',
				example: {
					statusCode: 200,
					message: MESSAGES.SUCCESS,
					status: true,
					type: 'Default',
					data: userData,
				},
			},
		},
	},
	deleteAccount: {
		200: {
			schema: {
				type: 'object',
				example: {
					statusCode: 200,
					message: MESSAGES.SUCCESS,
					status: true,
					type: 'Default',
				},
			},
		},
	},
	fileUpload: {
		200: {
			schema: {
				type: 'object',
				example: {
					message: MESSAGES.FILE_UPLOADED_SUCCESSFULLY,
					data: 'https://d2k2rpt0lk7syj.cloudfront.net/test/chat_1648710480510.png',
				},
			},
		},
		400: {
			schema: {
				type: 'object',
				example: {
					message: 'groupId is required.',
				},
			},
		},
	},
};
