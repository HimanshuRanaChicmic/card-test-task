/* eslint-disable no-cond-assign */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */

'use strict';

const fs = require('fs');
const j2s = require('joi-to-swagger');
const swaggerJson = require('../../config').swagger;

let singleton;
const { MESSAGES, ERROR_TYPES } = require('../utils/constants');

const defaultResponse = {
	200: {
		schema: {
			type: 'object',
			example: {
				status: true,
				statusCode: 200,
				type: 'Default',
				message: MESSAGES.SUCCESS,
			},
			properties: {
				statusCode: {
					type: 'integer',
					format: 'int32',
					example: 200,
				},
			},
		},
	},
	201: {
		schema: {
			type: 'object',
			example: {
				status: true,
				statusCode: 201,
				type: 'Default',
				message: MESSAGES.SUCCESS,
			},
			properties: {
				statusCode: {
					type: 'integer',
					format: 'int32',
					example: 201,
				},
			},
		},
	},
	400: {
		schema: {
			type: 'object',
			example: {
				status: false,
				statusCode: 400,
				type: ERROR_TYPES.BAD_REQUEST,
				message: MESSAGES.BAD_REQUEST,
			},
			properties: {
				statusCode: {
					type: 'integer',
					format: 'int32',
					example: 401,
				},
			},
		},
	},
	401: {
		schema: {
			type: 'object',
			example: {
				status: false,
				statusCode: 401,
				type: ERROR_TYPES.UNAUTHORIZED,
				message: MESSAGES.UNAUTHORIZED,
			},
			properties: {
				statusCode: {
					type: 'integer',
					format: 'int32',
					example: 401,
				},
			},
		},
	},
	404: {
		schema: {
			type: 'object',
			example: {
				status: false,
				statusCode: 404,
				type: ERROR_TYPES.DATA_NOT_FOUND,
				message: MESSAGES.NOT_FOUND,
			},
			properties: {
				statusCode: {
					type: 'integer',
					format: 'int32',
					example: 401,
				},
			},
		},
	},
	500: {
		schema: {
			type: 'object',
			example: {
				status: true,
				statusCode: 500,
				type: ERROR_TYPES.INTERNAL_SERVER_ERROR,
				message: MESSAGES.INTERNAL_SERVER_ERROR,
			},
			properties: {
				statusCode: {
					type: 'integer',
					format: 'int32',
					example: 500,
				},
			},
		},
	},
};

const optimizeSwaggerResponse = (status, resp) => {
	const defaultStatus = [ 200, 401, 500 ];
	if (resp === false) {
		return;
	}
	if (defaultStatus.includes(status) && !resp) {
		resp = defaultResponse[status];
	}
	if (resp) {
		if (resp.schema) {
			resp.schema.type = resp.schema.type ? resp.schema.type : 'object';
		}
		if (resp.schema.type === 'object') {
			if (resp.schema.example && resp.schema.example.constructor.name === 'Object') {
				resp.schema.example = { ...defaultResponse[status].schema.example, ...resp.schema.example };
			}
			if (resp.schema.properties) {
				resp.schema.properties = { ...defaultResponse[status].schema.properties, ...resp.schema.properties };
			} else {
				resp.schema.properties = defaultResponse[status].schema.properties;
			}
		}
	}
	// eslint-disable-next-line consistent-return
	return resp;
};

const mapSwaggerResponse = (data) => {
	const returnData = {};
	[ 200, 201, 400, 401, 404, 500 ].forEach((status) => {
		returnData[status] = optimizeSwaggerResponse(status, data ? data[status] : data);
	});
	return returnData;
};

class Swagger {
	static instance() {
		if (!singleton) {
			singleton = new Swagger();
			singleton.currentRoute = [];
			singleton.paths = {};
			singleton.definitions = {};
			return singleton;
		}

		return this;
	}

	createJsonDoc(info, host, basePath) {
		let swaggerData = swaggerJson;
		if (info) {
			swaggerData = {
				...swaggerData,
				info,
			};
		}

		if (host) {
			swaggerData = {
				...swaggerData,
				host,
			};
		}

		if (basePath) {
			swaggerData = {
				...swaggerData,
				basePath,
			};
		}

		return fs.writeFileSync('swagger.json', JSON.stringify(swaggerData));
	}

	addNewRoute(joiDefinitions, path, method) {
		if (this.currentRoute.includes(path + method)) {
			return false;
		}

		this.currentRoute.push(path + method);

		const swaggerData = fs.readFileSync('swagger.json', 'utf-8');
		const otherData = JSON.parse(swaggerData);
		const name = joiDefinitions.model || Date.now();
		const tag = joiDefinitions.group || 'default';
		const summary = joiDefinitions.description || 'No desc';

		const toSwagger = j2s(joiDefinitions).swagger;
		if (toSwagger && toSwagger.properties && toSwagger.properties.body) {
			this.definitions = {
				...this.definitions,
				[name]: toSwagger.properties.body,
			};
		}

		const pathArray = path.split('/').filter(Boolean);
		const transformPath = pathArray.map((path) => {
			if (path.charAt(0) === ':') {
				return `/{${path.substr(1)}}`;
			}

			return `/${path}`;
		})
			.join('');

		const parameters = [];

		const {
			body, params, query, headers, formData,
		} = joiDefinitions;

		if (body) {
			parameters.push({
				in: 'body',
				name: 'body',
				// ...toSwagger.properties.body
				schema: {
					$ref: `#/definitions/${name}`,
				},
			});
		}

		if (params) {
			const getParams = [];
			const rxp = /{([^}]+)}/g;
			let curMatch;

			while (curMatch = rxp.exec(transformPath)) {
				getParams.push(curMatch[1]);
			}
			const requiredFields = toSwagger.properties.params.required;
			getParams.forEach((param) => {
				const index = requiredFields ? requiredFields.findIndex((key) => key === param) : -1;

				if (index > -1) {
					toSwagger.properties.params.properties[param].required = true;
				}
				parameters.push({
					name: param,
					in: 'path',
					...toSwagger.properties.params.properties[param],
				});
			});
		}

		if (query) {
			const keys = Object.keys(toSwagger.properties.query.properties).map((key) => key);
			const requiredFields = toSwagger.properties.query.required;
			keys.forEach((key) => {
				const index = requiredFields ? requiredFields.findIndex((requiredKey) => requiredKey === key) : -1;
				if (index > -1) {
					toSwagger.properties.query.properties[key].required = true;
				}
				parameters.push({
					in: 'query',
					name: key,
					...toSwagger.properties.query.properties[key],
				});
			});
		}

		if (formData) {
			toSwagger.properties.formData.properties = {
				...(toSwagger.properties.formData.properties.file && toSwagger.properties.formData.properties.file.properties),
				...(toSwagger.properties.formData.properties.fileArray
          && toSwagger.properties.formData.properties.fileArray.properties),
				...(toSwagger.properties.formData.properties.files && toSwagger.properties.formData.properties.files.properties),
				...(toSwagger.properties.formData.properties.body && toSwagger.properties.formData.properties.body.properties),
			};
			const keys = Object.keys(toSwagger.properties.formData.properties).map((key) => key);
			const requiredFields = toSwagger.properties.formData.required;
			keys.forEach((key) => {
				const index = requiredFields ? requiredFields.findIndex((requiredKey) => requiredKey === key) : -1;
				if (index > -1) {
					toSwagger.properties.formData.properties[key].required = true;
				}
				parameters.push({
					in: 'formData',
					name: key,
					...toSwagger.properties.formData.properties[key],
				});
			});
		}

		if (headers) {
			const keys = Object.keys(toSwagger.properties.headers.properties).map((key) => key);
			const requiredFields = toSwagger.properties.headers.required;
			keys.forEach((key) => {
				const index = requiredFields ? requiredFields.findIndex((requiredKey) => requiredKey === key) : -1;
				if (index > -1) {
					toSwagger.properties.headers.properties[key].required = true;
				}
				parameters.push({
					in: 'header',
					name: key,
					...toSwagger.properties.headers.properties[key],
				});
			});
		}
		if (this.paths && this.paths[transformPath]) {
			this.paths[transformPath] = {
				...this.paths[transformPath],
				[method]: {
					tags: [
						tag,
					],
					summary,
					responses: mapSwaggerResponse(joiDefinitions.response),
					parameters,
				},
			};
		} else {
			this.paths = {
				...this.paths,
				[transformPath]: {
					[method]: {
						tags: [
							tag,
						],
						summary,
						responses: mapSwaggerResponse(joiDefinitions.response),
						parameters,
					},
				},
			};
		}

		const newData = {
			...otherData,
			definitions: this.definitions,
			paths: this.paths,
		};

		return fs.writeFileSync('swagger.json', JSON.stringify(newData));
	}
}

exports.swaggerDoc = Swagger.instance();
