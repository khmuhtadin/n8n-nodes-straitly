import type { IDataObject } from 'n8n-workflow';
import type { ResourceModule } from '../../types';
import { straitlyApiRequest } from '../../transport';

export const model: ResourceModule = {
	value: 'model',
	name: 'Model',
	description: 'Browse available models',
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['model'],
				},
			},
			options: [
				{
					name: 'Get',
					value: 'get',
					description: 'Get a model by ID',
					action: 'Get a model',
				},
				{
					name: 'Get Many',
					value: 'getMany',
					description: 'Get available models',
					action: 'Get many models',
				},
			],
			default: 'getMany',
		},
		{
			displayName: 'Model',
			name: 'modelId',
			type: 'resourceLocator',
			default: {
				mode: 'list',
				value: '',
			},
			description: 'The model to retrieve',
			displayOptions: {
				show: {
					resource: ['model'],
					operation: ['get'],
				},
			},
			required: true,
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'searchModels',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
				},
			],
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: {
				show: {
					resource: ['model'],
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
					resource: ['model'],
					operation: ['getMany'],
					returnAll: [false],
				},
			},
			typeOptions: {
				minValue: 1,
			},
		},
		{
			displayName: 'Simplify',
			name: 'simplify',
			type: 'boolean',
			default: true,
			description: 'Whether to return a simplified model with prices per million tokens',
			displayOptions: {
				show: {
					resource: ['model'],
					operation: ['getMany'],
				},
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
					resource: ['model'],
					operation: ['getMany'],
				},
			},
			placeholder: 'Add Field',
			options: [
				{
					displayName: 'Search',
					name: 'search',
					type: 'string',
					default: '',
					description: 'Filter model ID or name by text',
				},
				{
					displayName: 'Supports Tools',
					name: 'tools',
					type: 'boolean',
					default: false,
					description: 'Whether to return only models that support tools',
				},
				{
					displayName: 'Supports Vision',
					name: 'vision',
					type: 'boolean',
					default: false,
					description: 'Whether to return only models that accept images',
				},
			],
		},
	],
	async execute(operation, itemIndex) {
		if (operation === 'get') {
			const id = this.getNodeParameter('modelId', itemIndex, '', { extractValue: true }) as string;
			return await straitlyApiRequest.call(this, 'GET', '/models/' + encodeURIComponent(id), {
				itemIndex,
			});
		}
		const result = await straitlyApiRequest.call(this, 'GET', '/models', { itemIndex });
		const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
		const simplify = this.getNodeParameter('simplify', itemIndex, true) as boolean;
		const all = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
		const limit = all ? undefined : (this.getNodeParameter('limit', itemIndex, 50) as number);
		let rows = Array.isArray(result.data) ? (result.data as IDataObject[]) : [];
		const search = String(filters.search ?? '').toLowerCase();
		rows = rows.filter((row) => {
			const architecture = (row.architecture ?? {}) as IDataObject;
			return (
				(!search ||
					String(row.id ?? '')
						.toLowerCase()
						.includes(search) ||
					String(row.name ?? '')
						.toLowerCase()
						.includes(search)) &&
				(!filters.vision ||
					(Array.isArray(architecture.input_modalities) &&
						(architecture.input_modalities as unknown[]).includes('image'))) &&
				(!filters.tools ||
					(Array.isArray(row.supported_parameters) &&
						(row.supported_parameters as unknown[]).includes('tools')))
			);
		});
		if (limit !== undefined) rows = rows.slice(0, limit);
		return simplify
			? rows.map((row) => {
					const arch = (row.architecture ?? {}) as IDataObject;
					const provider = (row.top_provider ?? {}) as IDataObject;
					const pricing = (row.pricing ?? {}) as IDataObject;
					const rate = (key: string) =>
						pricing[key] == null || pricing[key] === '' || !Number.isFinite(Number(pricing[key]))
							? null
							: Number(pricing[key]) * 1000000;
					return {
						id: row.id,
						name: row.name,
						description: row.description,
						context_length: row.context_length,
						max_output_tokens: provider.max_completion_tokens,
						input_modalities: arch.input_modalities,
						output_modalities: arch.output_modalities,
						supported_parameters: row.supported_parameters,
						input_price_usd_per_million: rate('prompt'),
						output_price_usd_per_million: rate('completion'),
						cache_read_price_usd_per_million: rate('input_cache_read'),
						cache_write_price_usd_per_million: rate('input_cache_write'),
					};
				})
			: rows;
	},
};
