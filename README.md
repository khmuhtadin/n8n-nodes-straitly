# n8n-nodes-straitly

[Straitly](https://straitly.ai) is an AI gateway that offers access to models from several providers through an OpenAI-compatible API. It routes requests through a network of providers and can move requests to another provider if one goes down.

This community package adds two nodes to n8n:

- **Straitly**: a regular node, also usable as an AI Agent tool, to send messages, find models and prices, check your account, manage child keys and inspect request logs.
- **Straitly Chat Model**: a chat model you connect to the AI Agent or a chain, with a searchable model list that shows prices.

## Installation

In a self-hosted n8n instance, go to **Settings > Community Nodes > Install**, enter `n8n-nodes-straitly` and confirm. See [n8n's installation instructions](https://docs.n8n.io/integrations/community-nodes/installation/) for more options.

## Credentials

1. Create an API key in [Straitly](https://straitly.ai/app/keys).
2. In n8n, create a **Straitly API** credential and enter the key.
3. The default base URL is `https://api.straitly.ai/v1`.

Keep the key private. Child-key and request-log operations require an account key with minting enabled. Straitly says to contact its support if your account receives `admin_scope_required`; see [Child keys](https://straitly.ai/docs/child-keys).

## Operations

<!-- operations:start -->
| Resource | Operation | Endpoint |
| --- | --- | --- |
| Chat | Message a Model | `POST /chat/completions` |
| Chat | Message a Model (Anthropic Format) | `POST /messages` |
| Chat | Count Tokens | `POST /messages/count_tokens` |
| Model | Get Many, Get | `GET /models`, `GET /models/{id}` |
| Account | Get Balance, Get Key Info | `GET /account/balance`, `GET /key` |
| Child Key | Create, Get, Get Many, Update, Rotate, Revoke, Get Spend | `/admin/keys...` |
| Request Log | Get Many, Get | `/admin/requests...` |
<!-- operations:end -->

## Usage notes

- **401**: the key may be missing, invalid or revoked. Check the credential and replace the key if needed.
- **402**: the prepaid balance may be exhausted or the key's daily spending cap reached. Add credits or review the cap.
- **404**: check the model ID using Model > Get Many, or check the endpoint and base URL.
- **429**: the request or concurrency limit may have been reached. A child key's lifetime budget can also be exhausted, which requires a budget change rather than waiting.
- The node automatically retries eligible 429 and transient 5xx responses with bounded backoff. Avoid adding another retry loop without accounting for these retries. See [Straitly's error reference](https://straitly.ai/docs/errors) for details.

## Straitly Chat Model

Add **Straitly Chat Model** to the Chat Model input of an **AI Agent** or **Basic LLM Chain**, pick your **Straitly API** credential and choose a model. The list shows each model's price per 1M input and output tokens. For an agent that uses tools, pick a model that supports tool calling.

Options: maximum number of tokens, sampling temperature, top P, timeout and max retries.

The node is built on n8n's official `@n8n/ai-node-sdk`, so it has no runtime dependencies of its own. It needs an n8n version that ships that SDK. On older versions, use the built-in OpenAI Chat Model with a custom base URL instead; see [the AI Agent guide](docs/ai-agent.md).

## Use as an AI Agent tool

The Straitly node can also be connected to an AI Agent as a tool (`usableAsTool`). Connect it to the agent's Tool input and set the operation the agent may use, for example Account > Get Balance or Model > Get Many. On self-hosted instances, community-node tool usage may require `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

## Example workflows

Import these from the n8n editor using **Workflow menu > Import from File**, then select your Straitly credential:

- [Simple prompt](examples/simple-prompt.json)
- [Choose a vision model](examples/cheapest-vision.json): selects by listed input-token price, not total cost. Supply an image in the prompt as needed.
- [Low-balance alert](examples/low-balance-alert.json): replace the placeholder with a notification node and set your threshold.

Check the field values and model availability before running. Chat requests can incur charges.

## Compatibility

Requires Node.js 20 or newer. The package is intended for n8n installations that support community nodes; n8n Cloud availability depends on verification and has not been established by this package.

## Development

```bash
npm install
npm run build
npm run lint
npm test
```

For an optional live smoke test, set `STRAITLY_API_KEY` in your environment and run `npm run smoke`. The read-only checks run by default; set `SMOKE_CHAT=1` to also send a small, potentially billable chat request. Never put keys in workflow exports or logs.

## Release

The GitHub Actions publish workflow publishes version tags with npm provenance. Configure npm trusted publishing first; see [the verification checklist](docs/verification-checklist.md).

## Disclaimer

This is an independent community node. It is not built or endorsed by Straitly.

## License

[MIT](LICENSE)
