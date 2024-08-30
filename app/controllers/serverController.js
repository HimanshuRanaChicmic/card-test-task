'use strict';

const { createSuccessResponse } = require('../helpers');
const { MESSAGES } = require('../utils/constants');

/** ************************************************
 ***************** User Controller ***************
 ************************************************* */
const serverController = {};

/**
 * function to get server response.
 * @returns
 */
serverController.checkServerStatus = async () => createSuccessResponse(MESSAGES.SERVER_IS_WORKING_FINE);

module.exports = serverController;
