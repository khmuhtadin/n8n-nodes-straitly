import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';
import type { ResourceModule } from '../../types';
import { straitlyApiRequest, straitlyApiRequestAllItems } from '../../transport';

export const request: ResourceModule = {
	value: 'request',
	name: 'Request Log',
	description: 'View child-key request history; minting must be enabled on the account',
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['request'],
				},
			},
			options: [
				{
					name: 'Get',
					value: 'get',
					description: 'Get a request by ID or partner reference',
					action: 'Get a request log',
				},
				{
					name: 'Get Many',
					value: 'getMany',
					description: 'Get child-key request history',
					action: 'Get many request logs',
				},
			],
			default: 'getMany',
		},
		{
			displayName: 'Look Up By',
			name: 'lookupBy',
			type: 'options',
			default: 'requestId',
			description: 'Choose whether to look up the Straitly request ID or your partner reference',
			displayOptions: {
				show: {
					resource: ['request'],
					operation: ['get'],
				},
			},
			options: [
				{
					name: 'Partner Reference',
					value: 'partnerRef',
				},
				{
					name: 'Request ID',
					value: 'requestId',
				},
			],
		},
		{
			displayName: 'Request ID or Partner Reference',
			name: 'requestId',
			type: 'string',
			default: '',
			description: 'The request ID or partner reference to look up',
			displayOptions: {
				show: {
					resource: ['request'],
					operation: ['get'],
				},
			},
			required: true,
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: {
				show: {
					resource: ['request'],
					operation: ['getMany'],
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			description: 'Max number of results to return',
			displayOptions: {
				show: {
					resource: ['request'],
					operation: ['getMany'],
					returnAll: [false],
				},
			},
			typeOptions: {
				minValue: 1,
			},
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			default: {},
			description: 'The filters to use',
			displayOptions: {
				show: {
					resource: ['request'],
					operation: ['getMany'],
				},
			},
			placeholder: 'Add Field',
			options: [
				{
					displayName: 'Customer Reference',
					name: 'customer_ref',
					type: 'string',
					default: '',
					description: 'Filter by your customer identifier',
				},
				{
					displayName: 'Key Hash',
					name: 'key_hash',
					type: 'string',
					default: '',
					description: 'Filter by the current credential hash',
				},
				{
					displayName: 'Key Reference',
					name: 'key_ref',
					type: 'string',
					default: '',
					description: 'Filter by the stable child key reference',
				},
				{
					displayName: 'Partner Reference',
					name: 'partner_ref',
					type: 'string',
					default: '',
					description: 'Filter by your request reference',
				},
				{
					displayName: 'Since',
					name: 'since',
					type: 'dateTime',
					default: '',
					description: 'Include requests from this date and time',
				},
				{
					displayName: 'Status',
					name: 'status',
					type: 'options',
					default: '',
					description: 'Filter by request status',
					options: [
						{
							name: 'Any',
							value: '',
						},
						{
							name: 'Completed',
							value: 'completed',
						},
						{
							name: 'Failed',
							value: 'failed',
						},
						{
							name: 'Pending',
							value: 'pending',
						},
					],
				},
				{
					displayName: 'Until',
					name: 'until',
					type: 'dateTime',
					default: '',
					description: 'Include requests up to this date and time',
				},
			],
		},
	],
	async execute(operation, itemIndex) {
		if (operation === 'get') {
			const id = this.getNodeParameter('requestId', itemIndex) as string;
			const by = this.getNodeParameter('lookupBy', itemIndex, 'requestId') as string;
			return await straitlyApiRequest.call(
				this,
				'GET',
				'/admin/requests/' + encodeURIComponent(id),
				{ qs: by === 'partnerRef' ? { by: 'partner_ref' } : {}, itemIndex },
			);
		}
		const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
		const qs: IDataObject = {};
		for (const [k, v] of Object.entries(filters)) {
			if (v === '' || v === undefined || v === null) continue;
			if (k === 'since' || k === 'until') {
				const time = Date.parse(String(v));
				if (!Number.isFinite(time))
					throw new NodeOperationError(this.getNode(), 'Invalid ' + k + ' date', { itemIndex });
				qs[k] = Math.floor(time / 1000);
			} else qs[k] = v;
		}
		const all = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
		return await straitlyApiRequestAllItems.call(
			this,
			'requests',
			'/admin/requests',
			qs,
			all ? undefined : (this.getNodeParameter('limit', itemIndex, 50) as number),
			itemIndex,
		);
	},
};
