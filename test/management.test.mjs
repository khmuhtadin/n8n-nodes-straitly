import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const dist = process.env.STRAITLY_DIST || resolve('dist');
const load = (name) => require(resolve(dist, `nodes/Straitly/resources/${name}/index.js`))[name];
const run = async (resource, operation, params = {}, responses = [{}]) => {
	const calls = [];
	const ctx = {
		getNodeParameter(name, index, fallback, options) {
			const v = params[name] ?? fallback;
			return options?.extractValue && typeof v === 'object' ? v.value : v;
		},
		getCredentials: async () => ({ baseUrl: 'https://example.test/v1' }),
		getNode: () => ({ name: 'Straitly', type: 'test', typeVersion: 1 }),
		continueOnFail: () => false,
		getInputData: () => [{ json: {} }],
		helpers: {
			async httpRequestWithAuthentication(credential, request) {
				calls.push({ credential, ...request });
				return responses[Math.min(calls.length - 1, responses.length - 1)];
			},
		},
	};
	const result = await load(resource).execute.call(ctx, operation, 0);
	return { calls, result };
};
const check = (call, method, path, body, qs) => {
	assert.equal(call.method, method);
	assert.equal(call.url, 'https://example.test/v1' + path);
	assert.deepEqual(call.body, body);
	assert.deepEqual(call.qs, qs);
};
for (const [op, path] of [
	['getBalance', '/account/balance'],
	['getKeyInfo', '/key'],
])
	test(`account ${op}`, async () => {
		const { calls, result } = await run('account', op, {}, [{ ok: true }]);
		check(calls[0], 'GET', path);
		assert.deepEqual(result, { ok: true });
	});
test('model get encodes a slash ID', async () => {
	const { calls, result } = await run(
		'model',
		'get',
		{ modelId: { value: 'deepseek/deepseek-v4-1-flash' } },
		[{ id: 'deepseek/deepseek-v4-1-flash' }],
	);
	check(calls[0], 'GET', '/models/deepseek%2Fdeepseek-v4-1-flash');
	assert.equal(result.id, 'deepseek/deepseek-v4-1-flash');
});
const sample = {
	id: 'vendor/vision',
	name: 'Vision',
	description: 'test',
	context_length: 100,
	architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
	top_provider: { max_completion_tokens: 10 },
	supported_parameters: ['tools'],
	pricing: {
		prompt: '0.000001',
		completion: '0.000002',
		input_cache_read: '0.0000001',
		input_cache_write: '0.0000002',
	},
};
test('model getMany filters, limits, and simplifies per million prices', async () => {
	const { calls, result } = await run(
		'model',
		'getMany',
		{
			filters: { search: 'VISION', tools: true, vision: true },
			returnAll: false,
			limit: 1,
			simplify: true,
		},
		[{ data: [sample, sample, { id: 'other' }] }],
	);
	check(calls[0], 'GET', '/models');
	assert.equal(result.length, 1);
	assert.deepEqual(result[0], {
		id: 'vendor/vision',
		name: 'Vision',
		description: 'test',
		context_length: 100,
		max_output_tokens: 10,
		input_modalities: ['text', 'image'],
		output_modalities: ['text'],
		supported_parameters: ['tools'],
		input_price_usd_per_million: 1,
		output_price_usd_per_million: 2,
		cache_read_price_usd_per_million: 0.09999999999999999,
		cache_write_price_usd_per_million: 0.19999999999999998,
	});
});
test('model getMany raw', async () => {
	const { result } = await run('model', 'getMany', { returnAll: true, simplify: false }, [
		{ data: [sample] },
	]);
	assert.deepEqual(result, [sample]);
});
test('child key create omits empty fields and converts origins', async () => {
	const { calls, result } = await run(
		'childKey',
		'create',
		{
			additionalFields: {
				label: 'prod',
				customer_ref: '',
				total_cap_usd: 0,
				allowed_origins: 'https://a.test, https://b.test',
			},
		},
		[{ key: 'once' }],
	);
	check(calls[0], 'POST', '/admin/keys', {
		label: 'prod',
		total_cap_usd: 0,
		allowed_origins: ['https://a.test', 'https://b.test'],
	});
	assert.deepEqual(result, { key: 'once' });
});
test('child key update clears caps and resets limits with null', async () => {
	const { calls } = await run('childKey', 'update', {
		keyHash: 'abc/def',
		additionalFields: { label: 'new', daily_cap_usd: 3, customer_ref: '' },
		clearFields: ['daily_cap_usd', 'rpm_limit'],
	});
	check(calls[0], 'PATCH', '/admin/keys/abc%2Fdef', {
		label: 'new',
		daily_cap_usd: null,
		rpm_limit: null,
	});
});
for (const [op, method, path, body] of [
	['get', 'GET', '', undefined],
	['getSpend', 'GET', '/spend', undefined],
	['delete', 'DELETE', '', undefined],
	['rotate', 'POST', '/rotate', { grace_seconds: 60 }],
])
	test(`child key ${op}`, async () => {
		const { calls, result } = await run('childKey', op, { keyHash: 'hash', graceSeconds: 60 }, [
			{ ok: true },
		]);
		check(calls[0], method, '/admin/keys/hash' + path, body);
		assert.deepEqual(result, { ok: true });
	});
test('child key getMany paginates with filters and limit', async () => {
	const { calls, result } = await run(
		'childKey',
		'getMany',
		{ filters: { customer_ref: 'customer', key_ref: 'lk_1', include_disabled: true }, limit: 3 },
		[
			{ keys: [{ id: 1 }, { id: 2 }], next_cursor: 'next' },
			{ keys: [{ id: 3 }, { id: 4 }], next_cursor: null },
		],
	);
	check(calls[0], 'GET', '/admin/keys', undefined, {
		customer_ref: 'customer',
		key_ref: 'lk_1',
		include_disabled: true,
		limit: 3,
	});
	check(calls[1], 'GET', '/admin/keys', undefined, {
		customer_ref: 'customer',
		key_ref: 'lk_1',
		include_disabled: true,
		limit: 1,
		cursor: 'next',
	});
	assert.deepEqual(result, [{ id: 1 }, { id: 2 }, { id: 3 }]);
});
for (const [lookupBy, qs] of [
	['requestId', undefined],
	['partnerRef', { by: 'partner_ref' }],
])
	test(`request get ${lookupBy}`, async () => {
		const { calls, result } = await run('request', 'get', { requestId: 'ref/one', lookupBy }, [
			{ request_id: 'id' },
		]);
		check(calls[0], 'GET', '/admin/requests/ref%2Fone', undefined, qs);
		assert.deepEqual(result, { request_id: 'id' });
	});
test('request getMany paginates and converts dates to Unix seconds', async () => {
	const filters = {
		key_ref: 'lk',
		key_hash: 'hash',
		customer_ref: 'cust',
		partner_ref: 'ref',
		status: 'failed',
		since: '2026-11-01T00:00:00Z',
		until: '2026-11-02T00:00:00Z',
	};
	const { calls, result } = await run('request', 'getMany', { filters, limit: 3 }, [
		{ requests: [{ id: 1 }, { id: 2 }], next_cursor: 'more' },
		{ requests: [{ id: 3 }], next_cursor: null },
	]);
	const q = { ...filters, since: 1793491200, until: 1793577600, limit: 3 };
	check(calls[0], 'GET', '/admin/requests', undefined, q);
	check(calls[1], 'GET', '/admin/requests', undefined, { ...q, limit: 1, cursor: 'more' });
	assert.equal(result.length, 3);
});
for (const operation of ['create', 'rotate'])
	test(`child key ${operation} does not retry a server error`, async () => {
		let calls = 0;
		const context = {
			getNodeParameter(name, index, fallback) {
				return name === 'keyHash' ? 'hash' : fallback;
			},
			getCredentials: async () => ({ baseUrl: 'https://example.test/v1' }),
			getNode: () => ({ name: 'Straitly', type: 'test', typeVersion: 1 }),
			helpers: {
				async httpRequestWithAuthentication() {
					calls++;
					throw Object.assign(new Error('temporary failure'), { status: 500 });
				},
			},
		};
		await assert.rejects(load('childKey').execute.call(context, operation, 0));
		assert.equal(calls, 1);
	});
