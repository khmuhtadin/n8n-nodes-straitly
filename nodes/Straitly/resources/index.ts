import type { ResourceModule } from '../types';
import { account } from './account';
import { chat } from './chat';
import { childKey } from './childKey';
import { model } from './model';
import { request } from './request';

/** Order here is the order in the Resource dropdown (alphabetical by name, as the n8n linter wants). */
export const resources: ResourceModule[] = [account, chat, childKey, model, request];
