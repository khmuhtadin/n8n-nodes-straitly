# Use Straitly with the n8n AI Agent

There are two ways to use Straitly as the chat model of an AI Agent or chain.

## Option 1: Straitly Chat Model (this package)

1. Install `n8n-nodes-straitly` and create a **Straitly API** credential.
2. Add an **AI Agent** or **Basic LLM Chain** and connect **Straitly Chat Model** to its Chat Model input.
3. Pick a model from the list (prices are shown per 1M tokens) or enter a model ID.
4. For an AI Agent with tools, choose a model that supports tool calling.

## Option 2: built-in OpenAI Chat Model

This works without any community node.

1. Add an **AI Agent** or **Basic LLM Chain** to your workflow and connect an **OpenAI Chat Model** to its Chat Model input.
2. In the chat model, create an **OpenAI** credential. Enter your Straitly key in **API Key**, leave **Organization ID** blank, and set **Base URL** to `https://api.straitly.ai/v1`. Save the credential.
3. Select that credential and choose a Straitly model from the list, or switch the Model field to **ID** and enter an exact model ID, such as `deepseek/deepseek-v4-1-flash`.
4. Leave **Use Responses API** turned off. Straitly uses the OpenAI-compatible Chat Completions endpoint for this setup.
5. Run a small test. For an AI Agent with tools, choose a model that supports tool calling. Not every model supports every option.

A successful credential test checks connectivity, but may not prove that your key can make a paid model request. Run a small completion to verify it.

See [Straitly's documentation](https://straitly.ai/docs), the [n8n OpenAI Chat Model guide](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/), and [n8n OpenAI credentials](https://docs.n8n.io/integrations/builtin/credentials/openai/).
