'use strict';

const { Joi } = require('../../utils/joiUtils');
// const CONSTANTS = require('../../utils/constants');
const { nftsController } = require('../../controllers');

module.exports = [
	{
		method: 'POST',
		path: '/v1/nft/mint',
		joiSchemaForSwagger: {
			body: {
				ownerAddress: Joi.string().required().description('Address of owner.'),
				title: Joi.string().required().description('name or title of nft.'),
				description: Joi.string().required().description('description of nfft.'),
				imageUrl: Joi.string().uri().required()
			},
			group: 'NFT',
			description: 'Route to mint a nft.',
			model: 'mintNFT',
		},
		handler: nftsController.mintNFT,
	},
	{
		method: 'GET',
		path: '/v1/nfts',
		joiSchemaForSwagger: {
			query: {
				skip: Joi.number().default(0).optional().description('documents to skip'),
				limit: Joi.number().default(10).optional().description('documents to fetch'),
				walletAddress: Joi.string().required().description('wallet address')
			},
			group: 'NFT',
			description: 'Route to get all nfts',
			model: 'NftList',
		},
		handler: nftsController.getUserNfts
	}
];
