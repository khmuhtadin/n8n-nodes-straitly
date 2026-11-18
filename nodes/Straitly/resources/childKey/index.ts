import type { IDataObject } from 'n8n-workflow';
import type { ResourceModule } from '../../types';
import { straitlyApiRequest, straitlyApiRequestAllItems } from '../../transport';

export const childKey: ResourceModule = {
	value: 'childKey',
	name: 'Child Key',
	description: 'Manage child keys; minting must be enabled on the account',
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['childKey'],
				},
			},
			options: [
				{
					name: 'Create',
					value: 'create',
					description: 'Create a child key; the raw key is returned only once',
					action: 'Create a child key',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Get a child key by its current key hash',
					action: 'Get a child key',
				},
				{
					name: 'Get Many',
					value: 'getMany',
					description: 'Get child keys',
					action: 'Get many child keys',
				},
				{
					name: 'Get Spend',
					value: 'getSpend',
					description: 'Get spend for a child key',
					action: 'Get child key spend',
				},
				{
					name: 'Revoke',
					value: 'delete',
					description: 'Permanently revoke a child key',
					action: 'Revoke a child key',
				},
				{
					name: 'Rotate',
					value: 'rotate',
					description: 'Rotate a child key; the new raw key is returned only once',
					action: 'Rotate a child key',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update a child key',
					action: 'Update a child key',
				},
			],
			default: 'getMany',
		},
		{
			displayName: 'Key Hash',
			name: 'keyHash',
			type: 'string',
			default: '',
			description: 'The current credential hash for the child key',
			displayOptions: {
				show: {
					resource: ['childKey'],
					operation: ['get', 'getSpend', 'delete', 'rotate', 'update'],
				},
			},
			required: true,
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			default: {},
			description: 'The additional fields to use',
			displayOptions: {
				show: {
					resource: ['childKey'],
					operation: ['create', 'update'],
				},
			},
			placeholder: 'Add Field',
			options: [
				{
					displayName: 'Allowed Origins',
					name: 'allowed_origins',
					type: 'string',
					default: '',
					description: 'Comma-separated browser origins allowed to use the key',
				},
				{
					displayName: 'Concurrency Limit',
					name: 'concurrency_limit',
					type: 'number',
					default: 0,
					description: 'Maximum concurrent requests for the key',
					typeOptions: {
						minValue: 0,
					},
				},
				{
					displayName: 'Customer Reference',
					name: 'customer_ref',
					type: 'string',
					default: '',
					description: 'Your customer identifier',
				},
				{
					displayName: 'Daily Cap USD',
					name: 'daily_cap_usd',
					type: 'number',
					default: 0,
					description: 'Daily spending cap in USD',
					typeOptions: {
						minValue: 0,
					},
				},
				{
					displayName: 'Label',
					name: 'label',
					type: 'string',
					default: '',
					description: 'A label for the child key',
				},
				{
					displayName: 'Requests Per Minute Limit',
					name: 'rpm_limit',
					type: 'number',
					default: 0,
					description: 'Maximum requests per minute for the key',
					typeOptions: {
						minValue: 0,
					},
				},
				{
					displayName: 'Total Cap USD',
					name: 'total_cap_usd',
					type: 'number',
					default: 0,
					description: 'Lifetime spending cap in USD',
					typeOptions: {
						minValue: 0,
					},
				},
			],
		},
		{
			displayName: 'Fields to Clear',
			name: 'clearFields',
			type: 'multiOptions',
			default: [],
			description: 'Caps to clear or limits to reset to the parent plan',
			displayOptions: {
				show: {
					resource: ['childKey'],
					operation: ['update'],
				},
			},
			options: [
				{
					name: 'Concurrency Limit',
					value: 'concurrency_limit',
				},
				{
					name: 'Daily Cap USD',
					value: 'daily_cap_usd',
				},
				{
					name: 'Requests Per Minute Limit',
					value: 'rpm_limit',
				},
				{
					name: 'Total Cap USD',
					value: 'total_cap_usd',
				},
			],
		},
		{
			displayName: 'Grace Seconds',
			name: 'graceSeconds',
			type: 'number',
			default: 0,
			description: 'How long the previous key remains valid in seconds, up to seven days',
			displayOptions: {
				show: {
					resource: ['childKey'],
					operation: ['rotate'],
				},
			},
			typeOptions: {
				minValue: 0,
				maxValue: 604800,
			},
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: {
				show: {
					resource: ['childKey'],
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
					resource: ['childKey'],
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
					resource: ['childKey'],
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
					displayName: 'Include Disabled',
					name: 'include_disabled',
					type: 'boolean',
					default: false,
					description: 'Whether to include disabled keys',
				},
				{
					displayName: 'Key Reference',
					name: 'key_ref',
					type: 'string',
					default: '',
					description: 'Filter by the stable child key reference',
				},
			],
		},
	],
	async execute(operation, itemIndex) {
		if (operation === 'getMany') {
			const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
			const qs: IDataObject = {};
			for (const [k, v] of Object.entries(filters))
				if (v !== '' && v !== undefined && v !== null) qs[k] = v;
			const all = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			return await straitlyApiRequestAllItems.call(
				this,
				'keys',
				'/admin/keys',
				qs,
				all ? undefined : (this.getNodeParameter('limit', itemIndex, 50) as number),
				itemIndex,
			);
		}
		if (operation === 'create' || operation === 'update') {
			const fields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
			const body: IDataObject = {};
			for (const [k, v] of Object.entries(fields)) {
				if (v === '' || v === undefined || v === null) continue;
				body[k] =
					k === 'allowed_origins' && typeof v === 'string'
						? v
								.split(',')
								.map((s) => s.trim())
								.filter(Boolean)
						: v;
				if (Array.isArray(body[k]) && !(body[k] as unknown[]).length) delete body[k];
			}
			if (operation === 'update') {
				const clear = this.getNodeParameter('clearFields', itemIndex, []) as string[];
				for (const key of clear) body[key] = null;
			}
			const path =
				operation === 'create'
					? '/admin/keys'
					: '/admin/keys/' +
						encodeURIComponent(this.getNodeParameter('keyHash', itemIndex) as string);
			return await straitlyApiRequest.call(this, operation === 'create' ? 'POST' : 'PATCH', path, {
				body,
				itemIndex,
				...(operation === 'create' ? { retry: false } : {}),
			});
		}
		const path =
			'/admin/keys/' + encodeURIComponent(this.getNodeParameter('keyHash', itemIndex) as string);
		if (operation === 'rotate')
			return await straitlyApiRequest.call(this, 'POST', path + '/rotate', {
				body: { grace_seconds: this.getNodeParameter('graceSeconds', itemIndex, 0) as number },
				itemIndex,
				retry: false,
			});
		return await straitlyApiRequest.call(
			this,
			operation === 'delete' ? 'DELETE' : 'GET',
			path + (operation === 'getSpend' ? '/spend' : ''),
			{ itemIndex },
		);
	},
};
