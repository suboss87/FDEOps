# Examples - fictional demo engagements

**Everything in this directory is fictional. No real client data, no real companies, no real people.** Names, dates, metrics, and quotes are invented to show what disciplined `.fde/` memory looks like after real weeks embedded. No testimonials - just the artifacts.

## What's here

| Path | What it shows |
|------|---------------|
| [kesterman-freight/](./kesterman-freight/) | Mid-engagement, week 4. Trust green → amber with dated evidence. Brief said "build a dashboard"; `reality.md` says the ops team's spreadsheet is the real system of record. Three dated scope-change entries in `decisions.md` building toward the accumulation conversation. `context.md` interleaves agent session-close notes with the hook's `<!-- fdeops auto-capture -->` blocks. |
| [kesterman-freight/sample-debrief.txt](./kesterman-freight/sample-debrief.txt) | Raw meeting notes with `decision:` / `risk:` / `contact:` lines (one carrying a `[signal:amber]` token) - the kind of dump that gets piped through `fde debrief`. |
| [rennick-health/](./rennick-health/) | Early engagement, week 1. Trust RED with a dated `[signal:red]` token - the passed-over internal architect. Healthcare data boundary held in `risks.md` and `trust-profile.md`: PHI never enters AI context, policy-before-code. |
| [monday-morning.md](./monday-morning.md) | Illustrative transcript of a session open: memory auto-loads, the agent leads with state + the one thing worth attention. Every fact traces to a kesterman `.fde/` file. |
| [scan-fastify-pinned.txt](./scan-fastify-pinned.txt) | **Reproducible, real:** unedited `fde scan` of [fastify/fastify](https://github.com/fastify/fastify) at a pinned commit - clone it, check out the SHA in the file header, run `npx fdeops scan`, and diff it yourself. |
| [scan-output.txt](./scan-output.txt) | Full `fde scan` output against the fictional `kesterman-dispatch` legacy repo - hotspots with no test neighbors, "temporary" archaeology, a redacted secret, the abandoned rewrite visible in git history. |
| [fieldbook.html](./fieldbook.html) | The portfolio dashboard rendered by `fde dashboard` from these two engagements. Tool-generated, not handwritten - download and open locally. |
| [garvey-payments/](./garvey-payments/) | Annotated day-by-day walkthrough (day 1 → day 10) with the prompts that produce each file. |

## Signal tokens

`stakeholders.md` lines carry structured trust signals with dates:

```
- [2026-07-01] [signal:amber] Denise stopped replying to demo invites
```

`red` outranks `amber` outranks `green` in `fde status` and the fieldbook. Signals move on evidence, never on inference - the evidence lives on the same line as the token.

## Recreate this

```bash
fde resume --init <client-name>   # creates ~/fde-engagements/<client-name>/.fde/
# ...work: @fde routes, artifacts write themselves, hooks capture session ends
fde dashboard                     # renders every engagement into one local fieldbook.html
```

The files here are what four weeks (kesterman) and four days (rennick) of that loop leave behind.
