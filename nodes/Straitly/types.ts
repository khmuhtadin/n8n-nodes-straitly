import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

/**
 * One resource of the Straitly node. Each resource lives in
 * nodes/Straitly/resources/<value>/index.ts and exports a `ResourceModule`.
 */
export interface ResourceModule {
	/** Internal value, e.g. 'chat'. */
	value: string;
	/** Display name in the Resource dropdown (Title Case). */
	name: string;
	description: string;
	/**
	 * Every field of this resource, written as literal objects so the n8n linter can read them.
	 * The FIRST entry is the Operation dropdown:
	 *   { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
	 *     displayOptions: { show: { resource: ['<value>'] } }, options: [...], default: '<op>' }
	 * Every other property MUST carry displayOptions.show = { resource: ['<value>'], operation: [...] }.
	 */
	properties: INodeProperties[];
	/** Runs one input item. Return one object or an array of objects (one output item each). */
	execute(
		this: IExecuteFunctions,
		operation: string,
		itemIndex: number,
	): Promise<IDataObject | IDataObject[]>;
}
