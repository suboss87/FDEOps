# Local models

The FDEOps CLI and offline dashboard need Node.js and Git, not a model. AI-assisted work additionally needs a local model **and an agent host that can read files and run approved CLI commands**. A chat box with the skill pasted into its system prompt does not automatically gain those capabilities.

## Use your existing local agent

1. Download FDEOps, your agent host and your model while online. After that, the CLI operates offline. Model/provider configuration belongs to the host; FDEOps does not start or configure an inference server.
2. From the client workspace, run `node /path/to/fdeops/bin/fde.js resume --init my-client` to create and bind a local record.
3. Make `skills/fde/SKILL.md` and its references available to the host. Use the host's documented skill/file mechanism. Give it the FDEOps CLI path and permission to read the bound record and execute the requested commands.
4. Start with `fde resume` and ask for the next action. Inspect the tool calls, cited records and any proposed writes before trusting the workflow.

Use `fde recall <topic>` for relevant evidence. `resume` and `recall` default to a 16 KiB output ceiling; `--max-bytes 4096` requests a smaller allowance. This limits FDEOps output, not the host's entire context window. Keep unrelated transcripts and tools out of the active context. Private blocks must stay out of direct file reads as well as prompts.

## What compatibility means

- **CLI verified:** commands work without a model.
- **Transport verified:** the host can call a model or MCP server and receive a valid response.
- **Workflow verified:** that exact host/model combination selects tools, uses the correct client, preserves constraints, and returns a useful result.

These are separate checks. Model size alone does not establish quality, and FDEOps does not promise support for every model. Record the model/version, context setting, tool permissions, task, and actual outcome. Test a scope change, missing evidence and a refused approval before relying on a new model for client delivery.

See [verification results](../docs/verification.md) for the combinations actually exercised. No automatic Claude session hooks are implied for local agent hosts.
