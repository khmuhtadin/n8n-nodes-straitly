import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const dist = resolve(process.env.STRAITLY_DIST ?? 'dist');
const { StraitlyChatModel } = require(`${dist}/nodes/StraitlyChatModel/StraitlyChatModel.node.js`);

test('chat model node is an AI language model sub-node with a searchable model list', () => {
	const node = new StraitlyChatModel();
	const d = node.description;
	assert.equal(d.name, 'straitlyChatModel');
	assert.deepEqual(d.inputs, []);
	assert.deepEqual(d.outputs, ['ai_languageModel']);
	assert.equal(d.credentials[0].name, 'straitlyApi');
	const model = d.properties.find((p) => p.name === 'model');
	assert.equal(model.type, 'resourceLocator');
	assert.equal(model.modes[0].typeOptions.searchListMethod, 'searchModels');
	assert.equal(typeof node.methods.listSearch.searchModels, 'function');
	assert.equal(typeof node.supplyData, 'function');
});
