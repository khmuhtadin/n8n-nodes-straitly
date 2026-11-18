import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { ResourceModule } from '../../types';
import { straitlyApiRequest } from '../../transport';

function parseJson(
	this: IExecuteFunctions,
	value: string,
	label: string,
	itemIndex: number,
): unknown {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		throw new NodeOperationError(this.getNode(), `${label} must be valid JSON`, { itemIndex });
	}
}

export const chat: ResourceModule = {
	value: 'chat',
	name: 'Chat',
	description: 'Send messages to models and count tokens',
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: ['chat'] } },
			options: [
				{
					name: 'Count Tokens',
					value: 'countTokens',
					action: 'Count tokens',
					description: 'Count input tokens for a message',
				},
				{
					name: 'Message a Model',
					value: 'complete',
					action: 'Message a model',
					description: 'Send messages in OpenAI format',
				},
				{
					name: 'Message a Model (Anthropic Format)',
					value: 'messages',
					action: 'Message a model in anthropic format',
					description: 'Send messages in Anthropic format',
				},
			],
			default: 'complete',
		},
		{
			displayName: 'Model',
			name: 'model',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			description: 'The model to use for this request',
			displayOptions: {
				show: { resource: ['chat'], operation: ['complete', 'messages', 'countTokens'] },
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: { searchListMethod: 'searchModels', searchable: true },
				},
				{ displayName: 'By ID', name: 'id', type: 'string', placeholder: 'provider/model' },
			],
		},
		{
			displayName: 'Input Mode',
			name: 'inputMode',
			type: 'options',
			options: [
				{ name: 'Messages (JSON)', value: 'json' },
				{ name: 'Prompt', value: 'prompt' },
			],
			default: 'prompt',
			description: 'How to provide the messages',
			displayOptions: {
				show: { resource: ['chat'], operation: ['complete', 'messages', 'countTokens'] },
			},
		},
		{
			displayName: 'Prompt',
			name: 'prompt',
			type: 'string',
			typeOptions: { rows: 3 },
			default: '',
			description: 'The user message to send',
			displayOptions: {
				show: {
					resource: ['chat'],
					operation: ['complete', 'messages', 'countTokens'],
					inputMode: ['prompt'],
				},
			},
		},
		{
			displayName: 'System Prompt',
			name: 'systemPrompt',
			type: 'string',
			typeOptions: { rows: 2 },
			default: '',
			description: 'Optional instructions for the model',
			displayOptions: {
				show: { resource: ['chat'], operation: ['complete', 'messages', 'countTokens'] },
			},
		},
		{
			displayName: 'Messages (JSON)',
			name: 'messagesJson',
			type: 'json',
			default: '[]',
			description: 'A JSON array of messages in the selected API format',
			displayOptions: {
				show: {
					resource: ['chat'],
					operation: ['complete', 'messages', 'countTokens'],
					inputMode: ['json'],
				},
			},
		},
		{
			displayName: 'Max Tokens',
			name: 'maxTokens',
			type: 'number',
			default: 1024,
			required: true,
			typeOptions: { minValue: 1 },
			description: 'Maximum number of output tokens',
			displayOptions: { show: { resource: ['chat'], operation: ['messages'] } },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: {
				show: { resource: ['chat'], operation: ['complete', 'messages', 'countTokens'] },
			},
			options: [
				{
					displayName: 'Image URLs',
					name: 'imageUrls',
					type: 'string',
					default: '',
					description: 'Comma-separated image URLs to attach to the prompt in simple mode',
				},
				{
					displayName: 'Max Tokens',
					name: 'maxTokens',
					type: 'number',
					default: 1024,
					typeOptions: { minValue: 1 },
					description: 'Maximum number of output tokens for OpenAI format',
				},
				{
					displayName: 'Request Reference',
					name: 'requestReference',
					type: 'string',
					default: '',
					description: 'Reference to associate with this request in Straitly logs',
				},
				{
					displayName: 'Response Format',
					name: 'responseFormat',
					type: 'options',
					default: 'text',
					description: 'Format for the model response in OpenAI format',
					options: [
						{ name: 'JSON Object', value: 'json_object' },
						{ name: 'JSON Schema', value: 'json_schema' },
						{ name: 'Text', value: 'text' },
					],
				},
				{
					displayName: 'Schema (JSON)',
					name: 'schemaJson',
					type: 'json',
					default: '{}',
					description: 'JSON schema response format definition, including name and schema',
				},
				{
					displayName: 'Simplify Output',
					name: 'simplify',
					type: 'boolean',
					default: true,
					description: 'Whether to return a simplified response instead of the raw API response',
				},
				{
					displayName: 'Stop Sequences',
					name: 'stop',
					type: 'string',
					default: '',
					description: 'Comma-separated sequences that stop generation',
				},
				{
					displayName: 'Temperature',
					name: 'temperature',
					type: 'number',
					default: 1,
					typeOptions: { minValue: 0, maxValue: 2 },
					description: 'Sampling temperature',
				},
				{
					displayName: 'Top P',
					name: 'topP',
					type: 'number',
					default: 1,
					typeOptions: { minValue: 0, maxValue: 1 },
					description: 'Nucleus sampling probability',
				},
			],
		},
	],
	async execute(operation, itemIndex) {
		const modelParam = this.getNodeParameter('model', itemIndex) as { value?: string } | string;
		const model = typeof modelParam === 'string' ? modelParam : modelParam.value;
		const mode = this.getNodeParameter('inputMode', itemIndex, 'prompt') as string;
		const system = this.getNodeParameter('systemPrompt', itemIndex, '') as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		const anthropic = operation !== 'complete';
		let messages: IDataObject[];
		if (mode === 'json') {
			const raw = this.getNodeParameter('messagesJson', itemIndex) as string;
			const parsed =
				typeof raw === 'string' ? parseJson.call(this, raw, 'Messages (JSON)', itemIndex) : raw;
			if (
				!Array.isArray(parsed) ||
				!parsed.every((m) => m && typeof m === 'object' && !Array.isArray(m))
			)
				throw new NodeOperationError(
					this.getNode(),
					'Messages (JSON) must be an array of message objects',
					{ itemIndex },
				);
			messages = parsed as IDataObject[];
		} else {
			const prompt = this.getNodeParameter('prompt', itemIndex, '') as string;
			const images = String(options.imageUrls ?? '')
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			const content = images.length
				? [
						{ type: 'text', text: prompt },
						...images.map((url) =>
							anthropic
								? { type: 'image', source: { type: 'url', url } }
								: { type: 'image_url', image_url: { url } },
						),
					]
				: prompt;
			messages = [{ role: 'user', content }];
		}
		if (system && !anthropic) messages.unshift({ role: 'system', content: system });
		const body: IDataObject = { model: model ?? '', messages };
		if (system && anthropic) body.system = system;
		if (operation === 'messages') body.max_tokens = this.getNodeParameter('maxTokens', itemIndex);
		if (operation === 'complete' && options.maxTokens !== undefined)
			body.max_tokens = options.maxTokens;
		if (operation !== 'countTokens') {
			if (options.temperature !== undefined) body.temperature = options.temperature;
			if (options.topP !== undefined) body.top_p = options.topP;
			if (options.stop)
				body[anthropic ? 'stop_sequences' : 'stop'] = String(options.stop)
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
			if (!anthropic && options.responseFormat && options.responseFormat !== 'text') {
				body.response_format = { type: options.responseFormat };
				if (options.responseFormat === 'json_schema') {
					const schema =
						typeof options.schemaJson === 'string'
							? parseJson.call(this, options.schemaJson, 'Schema (JSON)', itemIndex)
							: options.schemaJson;
					if (!schema || typeof schema !== 'object' || Array.isArray(schema))
						throw new NodeOperationError(this.getNode(), 'Schema (JSON) must be an object', {
							itemIndex,
						});
					(body.response_format as IDataObject).json_schema = schema as IDataObject;
				}
			}
		}
		const headers: IDataObject = {};
		if (anthropic) headers['anthropic-version'] = '2023-06-01';
		if (options.requestReference) headers['x-partner-request-ref'] = options.requestReference;
		const response = await straitlyApiRequest.call(
			this,
			'POST',
			operation === 'complete'
				? '/chat/completions'
				: operation === 'messages'
					? '/messages'
					: '/messages/count_tokens',
			{ body, headers, itemIndex },
		);
		if (operation === 'countTokens' || options.simplify === false) return response;
		if (anthropic) {
			const blocks = Array.isArray(response.content) ? (response.content as IDataObject[]) : [];
			return {
				text: blocks
					.filter((b) => b.type === 'text')
					.map((b) => String(b.text ?? ''))
					.join(''),
				model: response.model,
				stop_reason: response.stop_reason,
				usage: response.usage,
			};
		}
		const choices = Array.isArray(response.choices) ? (response.choices as IDataObject[]) : [];
		const choice = choices[0] ?? {};
		const message = (choice.message ?? {}) as IDataObject;
		const text = typeof message.content === 'string' ? message.content : '';
		const result: IDataObject = {
			text,
			model: response.model,
			finish_reason: choice.finish_reason,
			usage: response.usage,
		};
		if (response.request_id !== undefined) result.request_id = response.request_id;
		if (options.responseFormat === 'json_object' || options.responseFormat === 'json_schema') {
			try {
				result.json = JSON.parse(text) as IDataObject;
			} catch (error) {
				result.json_parse_error = (error as Error).message;
			}
		}
		return result;
	},
};
