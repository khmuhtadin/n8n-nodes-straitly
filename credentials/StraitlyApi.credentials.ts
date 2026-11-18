import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StraitlyApi implements ICredentialType {
	name = 'straitlyApi';

	displayName = 'Straitly API';

	icon: Icon = { light: 'file:../icons/straitly.svg', dark: 'file:../icons/straitly.dark.svg' };

	documentationUrl = 'https://straitly.ai/docs/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Straitly key (starts with sk-). Create one at straitly.ai/app/keys.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.straitly.ai/v1',
			required: true,
			description: 'Only change this if Straitly support gave you a different endpoint',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// GET /key is free and returns 401 for a bad key (GET /models answers 200 without a valid key).
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/key',
			method: 'GET',
		},
	};
}
