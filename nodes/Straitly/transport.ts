import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';

type Ctx = IExecuteFunctions | ILoadOptionsFunctions;

const RETRY_STATUS = new Set([429, 500, 502, 503, 504, 529]);
/** Codes that a retry cannot fix (see straitly.ai/docs/errors and /docs/child-keys). */
const NO_RETRY_CODES = new Set(['budget_exhausted', 'child_key_limit', 'insufficient_balance']);
const MAX_RETRIES = 3;
const MAX_WAIT_MS = 30_000;

export interface RequestOptions {
	body?: IDataObject;
	qs?: IDataObject;
	headers?: IDataObject;
	/** Item index, used for error reporting. */
	itemIndex?: number;
	/** Set false for calls that must not be repeated automatically. Default true. */
	retry?: boolean;
}

export async function getBaseUrl(this: Ctx): Promise<string> {
	const credentials = await this.getCredentials('straitlyApi');
	return String(credentials.baseUrl || 'https://api.straitly.ai/v1').replace(/\/+$/, '');
}

function statusOf(error: unknown): number | undefined {
	const e = error as { httpCode?: string | number; response?: { status?: number }; status?: number };
	const raw = e?.httpCode ?? e?.response?.status ?? e?.status;
	const n = Number(raw);
	return Number.isFinite(n) ? n : undefined;
}

function errorBodyOf(error: unknown): IDataObject | undefined {
	const e = error as { response?: { body?: unknown; data?: unknown }; context?: { data?: unknown } };
	const body = e?.response?.body ?? e?.response?.data ?? e?.context?.data;
	if (body && typeof body === 'object') return body as IDataObject;
	if (typeof body === 'string') {
		try {
			return JSON.parse(body) as IDataObject;
		} catch {
			return undefined;
		}
	}
	return undefined;
}

function retryAfterMs(error: unknown, attempt: number): number {
	const headers = (error as { response?: { headers?: Record<string, string> } })?.response?.headers;
	const header = headers?.['retry-after'] ?? headers?.['Retry-After'];
	const seconds = Number(header);
	const wait = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000 * 2 ** attempt;
	return Math.min(wait, MAX_WAIT_MS);
}

const HINTS: Record<number, string> = {
	401: 'Check that the Straitly API key in your credential is active.',
	402: 'Your Straitly balance or this key\'s spending cap is used up. Add credits at straitly.ai/app/wallet.',
	403: 'This key is not allowed to do this. Child-key and request-log calls need an account key with minting enabled.',
	404: 'Not found. For models, check the ID against the Model > Get Many operation.',
	429: 'Rate limit, concurrency limit or budget reached. Lower the request rate or raise the key\'s cap.',
};

/** Calls the Straitly API with the credential, retrying 429/5xx with Retry-After. */
export async function straitlyApiRequest(
	this: Ctx,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
): Promise<IDataObject> {
	const baseUrl = await getBaseUrl.call(this);
	const request: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		json: true,
		headers: { Accept: 'application/json', ...(options.headers ?? {}) },
	};
	if (options.body !== undefined) request.body = options.body;
	if (options.qs && Object.keys(options.qs).length) request.qs = options.qs;

	for (let attempt = 0; ; attempt++) {
		try {
			return (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'straitlyApi',
				request,
			)) as IDataObject;
		} catch (error) {
			const status = statusOf(error);
			const body = errorBodyOf(error);
			const apiError = (body?.error ?? {}) as IDataObject;
			const code = apiError.code !== undefined ? String(apiError.code) : undefined;
			const retryable =
				options.retry !== false &&
				status !== undefined &&
				RETRY_STATUS.has(status) &&
				!(code && NO_RETRY_CODES.has(code));
			if (retryable && attempt < MAX_RETRIES) {
				await sleep(retryAfterMs(error, attempt));
				continue;
			}
			const message = typeof apiError.message === 'string' ? apiError.message : undefined;
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: message ?? (error as Error).message,
				description: [code ? `Code: ${code}.` : '', status ? (HINTS[status] ?? '') : '']
					.filter(Boolean)
					.join(' '),
				httpCode: status !== undefined ? String(status) : undefined,
				itemIndex: options.itemIndex,
			});
		}
	}
}

/**
 * Follows `next_cursor` pagination (admin keys and admin requests).
 * `dataKey` is the array field in the response ('keys' or 'requests').
 */
export async function straitlyApiRequestAllItems(
	this: Ctx,
	dataKey: string,
	path: string,
	qs: IDataObject = {},
	limit?: number,
	itemIndex?: number,
): Promise<IDataObject[]> {
	const out: IDataObject[] = [];
	let cursor: string | undefined;
	do {
		const pageSize = limit !== undefined ? Math.min(200, limit - out.length) : 200;
		const page = await straitlyApiRequest.call(this, 'GET', path, {
			qs: { ...qs, limit: pageSize, ...(cursor ? { cursor } : {}) },
			itemIndex,
		});
		const rows = Array.isArray(page[dataKey]) ? (page[dataKey] as IDataObject[]) : [];
		out.push(...rows);
		cursor = typeof page.next_cursor === 'string' && page.next_cursor ? page.next_cursor : undefined;
		if (!rows.length) break;
	} while (cursor && (limit === undefined || out.length < limit));
	return limit !== undefined ? out.slice(0, limit) : out;
}
