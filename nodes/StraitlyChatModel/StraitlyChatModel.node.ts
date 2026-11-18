import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { supplyModel } from '@n8n/ai-node-sdk';

import { searchModels } from '../Straitly/methods';

type ModelOptions = {
	maxRetries?: number;
	maxTokens?: number;
	temperature?: number;
	timeout?: number;
	topP?: number;
};

export class StraitlyChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Straitly Chat Model',
		name: 'straitlyChatModel',
		icon: { light: 'file:../../icons/straitly.svg', dark: 'file:../../icons/straitly.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["model"].value || $parameter["model"]}}',
		description: 'Use any model on the Straitly AI gateway with the AI Agent and chains',
		defaults: {
			name: 'Straitly Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{ url: 'https://github.com/khmuhtadin/n8n-nodes-straitly#straitly-chat-model' },
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'straitlyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description:
					'The model that generates the reply. For the AI Agent, pick one that supports tool calling.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'searchModels', searchable: true },
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. claude-sonnet-5',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						typeOptions: { minValue: 0 },
						description: 'How many times to retry a failed request',
						type: 'number',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: 1024,
						typeOptions: { minValue: 1 },
						description: 'The most tokens the model may generate in one reply',
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness. Lower values give more focused replies, higher values more varied ones.',
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						typeOptions: { minValue: 1 },
						description: 'Maximum time a request may take, in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 2 },
						description: 'Nucleus sampling. Change this or the temperature, not both.',
						type: 'number',
					},
				],
			},
		],
	};

	methods = {
		listSearch: { searchModels },
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials('straitlyApi');
		const model = this.getNodeParameter('model', itemIndex, '', { extractValue: true }) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;
		const baseUrl = String(credentials.baseUrl || 'https://api.straitly.ai/v1').replace(/\/+$/, '');

		return supplyModel(this, {
			type: 'openai',
			baseUrl,
			apiKey: credentials.apiKey as string,
			model,
			...options,
		});
	}
}
