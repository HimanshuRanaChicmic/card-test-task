'use strict';

const { NORMAL_PROJECTION } = require('../utils/constants');

const dbService = {};

/**
* function to create.
*/
dbService.create = async (model, payload) => await new model(payload).save();

/**
* function to insert.
*/
dbService.insertMany = async (model, payload) => await model.insertMany(payload);

/**
* function to find.
*/
dbService.find = async (model, criteria, projection = {}) => await model.find(criteria, projection).lean();

/**
* function to find with sort, skip and limit.
*/
dbService.findPagination = async (model, criteria, projection = {}, sort = { _id: -1 }, skip = 0, limit = 0) => 
	await model.find(criteria, projection).sort(sort).skip(skip).limit(limit).lean();

/**
* function to find one.
*/
dbService.findOne = async (model, criteria, projection = NORMAL_PROJECTION) => await model
	.findOne(criteria, projection).lean();

/**
* function to update one.
*/
dbService.findOneAndUpdate = async (model, criteria, dataToUpdate, options = { new: true, upsert: true }) => await model
	.findOneAndUpdate(criteria, dataToUpdate, options).lean();

/**
* function to update Many.
*/
dbService.updateMany = async (model, criteria, dataToUpdate, projection = {}) => await model
	.updateMany(criteria, dataToUpdate, projection).lean();

/**
* function to delete one.
*/
dbService.deleteOne = async (model, criteria) => await model.deleteOne(criteria);

/**
* function to delete Many.
*/
dbService.deleteMany = async (model, criteria) => await model.deleteMany(criteria);

/**
* function to apply aggregate on model.
*/
dbService.aggregate = async (model, query) => await model.aggregate(query);

/**
* function to count docuemnt.
*/ dbService.count = async (model, criteria) => await model.countDocuments(criteria);


module.exports = dbService;
