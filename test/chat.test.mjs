import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { resolve } from 'node:path';
process.env.NODE_PATH = resolve('node_modules');
Module._initPaths();
const require = createRequire(import.meta.url);
const { chat } = require(
	resolve(process.env.STRAITLY_DIST || 'dist', 'nodes/Straitly/resources/chat/index.js'),
);
const openai = {
	model: 'm',
	choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
	usage: { total_tokens: 3 },
	request_id: 'req',
};
const anth = {
	model: 'm',
	content: [
		{ type: 'thinking', thinking: 'x' },
		{ type: 'text', text: 'hello' },
		{ type: 'text', text: ' world' },
	],
	stop_reason: 'end_turn',
	usage: { input_tokens: 2 },
};
function mock(params, response) {
	const calls = [];
	const ctx = {
		getNodeParameter(name, _index, fallback) {
			return name in params ? params[name] : fallback;
		},
		getCredentials: async () => ({ baseUrl: 'https://api.example/v1' }),
		getNode: () => ({ name: 'Straitly', type: 'x', typeVersion: 1, position: [0, 0] }),
		continueOnFail: () => false,
		getInputData: () => [],
		helpers: {
			async httpRequestWithAuthentication(auth, request) {
				calls.push({ auth, request });
				return response;
			},
		},
	};
	return { ctx, calls };
}
for (const operation of ['complete', 'messages', 'countTokens'])
	for (const mode of ['prompt', 'json']) {
		test(`${operation} ${mode} body and headers`, async () => {
			const params = {
				model: { mode: 'id', value: 'm' },
				inputMode: mode,
				prompt: 'hello',
				systemPrompt: 'rules',
				messagesJson: '[{"role":"user","content":"history"}]',
				maxTokens: 12,
				options: {
					requestReference: 'ref',
					simplify: false,
					...(operation === 'complete' ? { maxTokens: 9 } : {}),
				},
			};
			const response =
				operation === 'complete' ? openai : operation === 'messages' ? anth : { input_tokens: 17 };
			const { ctx, calls } = mock(params, response);
			const result = await chat.execute.call(ctx, operation, 2);
			assert.deepEqual(result, response);
			assert.equal(calls.length, 1);
			const { auth, request } = calls[0];
			assert.equal(auth, 'straitlyApi');
			assert.equal(request.method, 'POST');
			assert.equal(
				request.url,
				`https://api.example/v1/${operation === 'complete' ? 'chat/completions' : operation === 'messages' ? 'messages' : 'messages/count_tokens'}`,
			);
			assert.equal(request.qs, undefined);
			assert.equal(request.headers['x-partner-request-ref'], 'ref');
			assert.equal(
				request.headers['anthropic-version'],
				operation === 'complete' ? undefined : '2023-06-01',
			);
			const messages = [{ role: 'user', content: mode === 'prompt' ? 'hello' : 'history' }];
			if (operation === 'complete') messages.unshift({ role: 'system', content: 'rules' });
			assert.deepEqual(request.body, {
				model: 'm',
				messages,
				...(operation !== 'complete' ? { system: 'rules' } : {}),
				...(operation === 'messages'
					? { max_tokens: 12 }
					: operation === 'complete'
						? { max_tokens: 9 }
						: {}),
			});
		});
	}
test('simplifies OpenAI JSON and handles parse failure', async () => {
	for (const [text, valid] of [
		['{"ok":true}', true],
		['not json', false],
	]) {
		const { ctx } = mock(
			{ model: { value: 'm' }, prompt: 'x', options: { responseFormat: 'json_object' } },
			{ ...openai, choices: [{ message: { content: text }, finish_reason: 'stop' }] },
		);
		const out = await chat.execute.call(ctx, 'complete', 0);
		assert.equal(out.text, text);
		assert.equal(out.request_id, 'req');
		if (valid) assert.deepEqual(out.json, { ok: true });
		else assert.equal(typeof out.json_parse_error, 'string');
	}
});
test('simplifies Anthropic text blocks', async () => {
	const { ctx } = mock({ model: { value: 'm' }, prompt: 'x', maxTokens: 10 }, anth);
	assert.deepEqual(await chat.execute.call(ctx, 'messages', 0), {
		text: 'hello world',
		model: 'm',
		stop_reason: 'end_turn',
		usage: { input_tokens: 2 },
	});
});
test('rejects malformed messages JSON with item index', async () => {
	const { ctx } = mock({ model: { value: 'm' }, inputMode: 'json', messagesJson: '[' }, openai);
	await assert.rejects(
		chat.execute.call(ctx, 'complete', 3),
		(e) => e.message.includes('valid JSON') && e.context.itemIndex === 3,
	);
});
test('vision and response schema options', async () => {
	const { ctx, calls } = mock(
		{
			model: { value: 'm' },
			prompt: 'look',
			options: {
				imageUrls: 'https://example.com/a.png, https://example.com/b.png',
				responseFormat: 'json_schema',
				schemaJson: '{"name":"result","schema":{"type":"object"}}',
			},
		},
		openai,
	);
	await chat.execute.call(ctx, 'complete', 0);
	assert.equal(
		calls[0].request.body.messages[0].content[1].image_url.url,
		'https://example.com/a.png',
	);
	assert.deepEqual(calls[0].request.body.response_format, {
		type: 'json_schema',
		json_schema: { name: 'result', schema: { type: 'object' } },
	});
});
