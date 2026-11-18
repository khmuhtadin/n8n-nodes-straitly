#!/usr/bin/env node
// This is a local developer tool, not part of the published node runtime.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const key = process.env.STRAITLY_API_KEY;
if (!key) {
	console.error('Set STRAITLY_API_KEY before running the smoke test.');
	process.exit(1);
}
const require = createRequire(import.meta.url);
const { Straitly } = require(resolve('dist/nodes/Straitly/Straitly.node.js'));
const baseUrl = 'https://api.straitly.ai/v1';

async function run(label, params) {
	const context = {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, _index, fallback) =>
			Object.hasOwn(params, name) ? params[name] : fallback,
		getCredentials: async () => ({ apiKey: key, baseUrl }),
		getNode: () => ({
			name: 'Straitly smoke test',
			type: 'n8n-nodes-straitly.straitly',
			typeVersion: 1,
		}),
		continueOnFail: () => false,
		helpers: {
			async httpRequestWithAuthentication(_credential, options) {
				const url = new URL(options.url);
				for (const [name, value] of Object.entries(options.qs ?? {})) {
					if (value !== undefined && value !== null) url.searchParams.set(name, String(value));
				}
				const response = await fetch(url, {
					method: options.method,
					headers: {
						...options.headers,
						Authorization: `Bearer ${key}`,
						...(options.body ? { 'Content-Type': 'application/json' } : {}),
					},
					...(options.body ? { body: JSON.stringify(options.body) } : {}),
				});
				const text = await response.text();
				let body;
				try {
					body = JSON.parse(text);
				} catch {
					body = {};
				}
				if (!response.ok) {
					const error = new Error(`HTTP ${response.status}`);
					error.httpCode = response.status;
					error.response = {
						status: response.status,
						body,
						headers: Object.fromEntries(response.headers),
					};
					throw error;
				}
				return body;
			},
		},
	};
	const output = await new Straitly().execute.call(context);
	if (!Array.isArray(output) || !Array.isArray(output[0]) || !output[0].length)
		throw new Error('No output items');
	console.log(`${label}: OK (${output[0].length} item(s))`);
}

const checks = [
	['Account > Get Balance', { resource: 'account', operation: 'getBalance' }],
	['Account > Get Key Info', { resource: 'account', operation: 'getKeyInfo' }],
	['Model > Get Many', { resource: 'model', operation: 'getMany', returnAll: false, limit: 3 }],
];
if (process.env.SMOKE_CHAT === '1')
	checks.push([
		'Chat > Message a Model',
		{
			resource: 'chat',
			operation: 'complete',
			model: { __rl: true, mode: 'id', value: 'deepseek/deepseek-v4-1-flash' },
			inputMode: 'prompt',
			prompt: 'Say hi.',
			options: { maxTokens: 200 },
		},
	]);
let failed = false;
for (const [label, params] of checks) {
	try {
		await run(label, params);
	} catch (error) {
		failed = true;
		// Only print status, never raw response bodies, request headers or credentials.
		console.error(`${label}: FAILED${error.httpCode ? ` (HTTP ${error.httpCode})` : ''}`);
	}
}
if (failed) process.exitCode = 1;
