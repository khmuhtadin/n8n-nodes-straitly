import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { straitlyApiRequest } from './transport';

function perMillion(value: unknown): string | undefined {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return undefined;
	return `$${Number((n * 1_000_000).toFixed(4))}`;
}

/** Searchable model list for resourceLocator fields (listSearch method name: 'searchModels'). */
export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await straitlyApiRequest.call(this, 'GET', '/models');
	const models = Array.isArray(response.data) ? (response.data as IDataObject[]) : [];
	const needle = (filter ?? '').toLowerCase().trim();
	const results = models
		.filter((m) => {
			if (!needle) return true;
			return `${m.id} ${m.name ?? ''}`.toLowerCase().includes(needle);
		})
		.map((m) => {
			const pricing = (m.pricing ?? {}) as IDataObject;
			const input = perMillion(pricing.prompt);
			const output = perMillion(pricing.completion);
			const price = input && output ? ` (${input} in / ${output} out per 1M)` : '';
			return { name: `${m.name ?? m.id}${price}`, value: String(m.id) };
		});
	return { results };
}
