/* eslint-disable no-mixed-spaces-and-tabs */
'use strict';

const { createSuccessResponse, createErrorResponse } = require('../helpers');

const { dbService } = require('../services');
const { blockChainDataModel } = require('../models');
const CONFIG = require('../../config');
const { MESSAGES, ERROR_TYPES } = require('../utils/constants');
const { storeImageOnIPFS, pinJSONToIPFS, callThirdPartyAPI, validateEthereumAddress } = require('../utils/utils');


/** ************************************************
 ***************** NFTS Controller ***************
 ************************************************* */
const nftsController = {};

/**
 * function to mint or transfer nft.
 * @returns
 */
nftsController.mintNFT = async (payload) => {

	// validate if owneraddress is valid or not
	const isWalletAddressValid = await validateEthereumAddress(payload.ownerAddress);

	if(!isWalletAddressValid) throw createErrorResponse(MESSAGES.INVALID_WALLET_ADDRESS, ERROR_TYPES.BAD_REQUEST);

	const blockChainData = await dbService.findOne(blockChainDataModel, { });

	const tokenId = blockChainData.latestBId + 1;

	const ipfsResponse = await storeImageOnIPFS(payload.imageUrl);

	if (!ipfsResponse) {
		throw createErrorResponse(MESSAGES.INVALID_IMAGE_URL, ERROR_TYPES.BAD_REQUEST);

	}

	const data = JSON.stringify({
		pinataContent: {
			description: payload.description,
			'attributes': [
				{
					'trait_type': 'Background',
					'value': 'Desert'
				},
				{
					'trait_type': 'Level',
					'value': '1'
				}
			],
			external_url: 'https://pinata.cloud',
			image: `${CONFIG.IPFS.IPFS_DOMAIN_URL}/${ipfsResponse.IpfsHash}`
		},
		pinataMetadata: {
			name: `NFT-${tokenId}.json`
		}
	});

	const metaDataResponse = await pinJSONToIPFS(data);

	if (!metaDataResponse || !metaDataResponse.IpfsHash) {
		throw createErrorResponse(MESSAGES.ERROR_CREATING_IPFS, ERROR_TYPES.BAD_REQUEST);
	}

	try {
		const response = (await callThirdPartyAPI.post({
			API: `${CONFIG.IMMUTABLE_BASE_URL}/collections/0x988018096f15cbb70577310cff2164c7af457499/nfts/mint-requests`,
			DATA: {
				assets: [
					{
						reference_id: metaDataResponse.IpfsHash,
						owner_address: payload.ownerAddress,
						metaData: {
							'name': payload.title,
							'description': payload.description,
							'image': 'https://clashofhams.com/images/1',
							'external_url': 'https://clashofhams.com',
	
						}
					}
				]
			},
			HEADER: {
				'accept': 'application/json',
				'Content-Type': 'application/json',
				'x-immutable-api-key': CONFIG.IMMUTABLE_API_KEY
			},
		}));
	} catch(err) {
		throw createErrorResponse(MESSAGES.IPFS_HASH_ALREADY_CREATED, ERROR_TYPES.BAD_REQUEST);
	
	}

	await dbService.findOneAndUpdate(blockChainDataModel, {}, { latestBId: tokenId });

	return createSuccessResponse(MESSAGES.NFT_TRANSFERED_SUCCESSFULLY);
	


};

/**
 * get user nfts
 * @param {*} payload 
 * @returns 
 */
nftsController.getUserNfts = async (payload) => {

	// validate if owneraddress is valid or not
	const isWalletAddressValid = await validateEthereumAddress(payload.walletAddress);

	if(!isWalletAddressValid) throw createErrorResponse(MESSAGES.INVALID_WALLET_ADDRESS, ERROR_TYPES.BAD_REQUEST);
		

	const data = (await callThirdPartyAPI.get({
		API: `${CONFIG.IMMUTABLE_BASE_URL}/accounts/${payload.walletAddress}/nfts?contractAddress=${CONFIG.CONTRACT_ADDRESS}`,
		DATA: {},
		HEADER: {
			'accept': 'application/json',
			'Content-Type': 'application/json',
			'x-immutable-api-key': CONFIG.IMMUTABLE_API_KEY
		},
	}))?.data?.result;
	return Object.assign(createSuccessResponse(MESSAGES.DATA_FETCHED_SUCCESSFULLY), { data });
};


module.exports = nftsController;
