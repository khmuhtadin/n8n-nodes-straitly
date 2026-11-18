import type { ResourceModule } from '../../types';
import { straitlyApiRequest } from '../../transport';

export const account: ResourceModule = {
	value: 'account',
	name: 'Account',
	description: 'View account and API key information',
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: ['account'],
				},
			},
			options: [
				{
					name: 'Get Balance',
					value: 'getBalance',
					description: 'Get the available account balance',
					action: 'Get the account balance',
				},
				{
					name: 'Get Key Info',
					value: 'getKeyInfo',
					description: 'Get information about the current API key',
					action: 'Get key information',
				},
			],
			default: 'getBalance',
		},
	],
	async execute(operation, itemIndex) {
		return await straitlyApiRequest.call(
			this,
			'GET',
			operation === 'getBalance' ? '/account/balance' : '/key',
			{ itemIndex },
		);
	},
};
