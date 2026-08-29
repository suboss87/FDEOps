# fdeops - Local LLM Setup

Use fdeops with **any local model** - Ollama, LM Studio, llama.cpp, vLLM, Open WebUI, or any inference server that accepts a system prompt.

## Why it works

fdeops is a SKILL.md file + markdown memory + a Node.js CLI. It calls no external API. The AI does the skills; the CLI does the mechanics. Any model that can read a markdown system prompt can run fdeops.

## Setup

### 1. Install fdeops (same as any other setup)

```bash
npx fdeops init my-client
```

### 2. Load the skill into your local model

The file your model needs to read as system context:

```
# If you cloned the repo:
skills/fde/SKILL.md

# If you ran `node bin/install.js` (also sets up hooks + adapters):
~/.claude/skills/fde/SKILL.md
```

Either path works - same file. If you only want the local LLM workflow and skipped `install.js`, use the repo-local path directly.

How you load it depends on your setup:

| Tool | How to load |
|------|-------------|
| **Ollama + Open WebUI** | Paste the contents of `SKILL.md` into the system prompt field, or mount it as a file in your Modelfile |
| **LM Studio** | Add `SKILL.md` path to the system prompt in chat settings |
| **llama.cpp / server mode** | Pass `--system-prompt-file skills/fde/SKILL.md` |
| **vLLM + chat UI** | Include as the system message in your chat template |
| **Aider** | Run aider from your engagement workspace - it reads repo files including SKILL.md automatically |
| **Continue.dev (VS Code)** | Add SKILL.md as a context provider in `.continue/config.json` |
| **text-generation-webui** | Load SKILL.md content in the "Context" or "System prompt" tab |
| **Jan.ai** | Paste into the system prompt field in assistant settings |
| **GPT4All** | Add as system prompt in the model's chat configuration |

### 3. Set the engagement path

Your local model needs to know where the engagement memory lives. Set the environment variable before starting your session:

```bash
export FDEOPS_ENGAGEMENT=~/fde-engagements/my-client/.fde
```

Or tell the model directly: "My engagement is at ~/fde-engagements/my-client/.fde"

### 4. Use it

```
@fde I'm preparing for tomorrow's stakeholder meeting. The brief says payments API.
```

The model reads SKILL.md, routes to the right skill, and produces artifacts in your `.fde/` folder.

## Model size recommendations

The kit is detailed (30 skills, routing logic, evidence format, memory contract). Larger models handle it better:

| Model class | Experience |
|-------------|-----------|
| **7-8B** (Llama 3.1 8B, Mistral 7B, Qwen 2.5 7B) | Handles individual skills (readout, log, land). May struggle with complex routing or multi-skill sessions. Good for the CLI-heavy workflow where you invoke skills explicitly. |
| **13-34B** (Llama 3.1 13B, Mixtral 8x7B, Qwen 2.5 32B, DeepSeek-R1 32B) | Good across all domains. Routes correctly, follows memory contract, writes structured artifacts. Recommended minimum for full use. |
| **70B+** (Llama 3.1 405B, DeepSeek V3, Qwen 2.5 72B) | Full capability. Handles regulated overlays, switch-clients, board-memo pyramid, runbook handoff. |

## The CLI works without ANY model

Even if you can't run a local model (or you're at a regulated client with no AI permitted), the `fde` CLI gives you the deterministic tooling:

```bash
fde scan          # repo recon - hotspots, test gaps, AI components (git only)
fde resume        # load/create engagement memory
fde log           # structured append: decisions, risks, delivery, contacts
fde receipts      # "what did we agree?" - search memory with dates
fde status        # portfolio triage across all customers (red/amber/green)
fde dashboard     # offline HTML fieldbook across all engagements
fde capture       # session-end memory snapshot
```

Zero network. Zero AI. Pure local Node.js reading git and markdown.

## Ollama Modelfile example

```dockerfile
FROM llama3.1:70b

# System prompt provided at runtime via --system flag

PARAMETER temperature 0.3
PARAMETER num_ctx 32768
```

Then load the skill:
```bash
ollama run my-fde-model --system "$(cat skills/fde/SKILL.md)"
```

## Tips for local models

- **Context window matters.** SKILL.md + references can be large. Use a model with at least 8K context; 32K+ is ideal for loading skill references on demand.
- **Temperature 0.2-0.4 works best.** The skills are structured - lower temperature keeps routing accurate and artifacts consistent.
- **Use the CLI for mechanics.** Don't ask the model to do what the CLI already does deterministically. Use `fde scan` for repo recon, `fde log` for memory writes, `fde receipts` for searching. Let the model handle judgment, routing, and artifact drafting.
- **Explicit skill invocation.** If a smaller model struggles with routing, you can invoke skills directly: "@fde run the discover phase" or "@fde use hold-scope." The model skips routing and goes straight to the skill.
