# Privacy Policy

fdeops is local tooling. No fdeops-operated backend, telemetry, or accounts.

## What fdeops does

- Reads and writes files under **`FDEOPS_ENGAGEMENT`** (default `~/fde-engagements/<name>/.fde/`)
- Configures how your AI assistant behaves during an engagement
- Keeps engagement context on **your machine** unless you deliberately use an in-workspace `.fde/`

## What fdeops does not do

- Collect usage analytics
- Send engagement data to fdeops servers
- Register users or integrate third-party SaaS on your behalf

## Your data

Engagement notes may include sensitive business information. You control storage, backup, and sharing. fdeops does not encrypt or police commits for you.

## The fieldbook dashboard

`fde dashboard` renders your engagements into a local `fieldbook.html` (default `~/fde-engagements/fieldbook.html`). It is a static file - no server, no network calls, works offline. Anything inside a `<private>…</private>` block in your `.fde/` notes is **redacted** from the rendered page (closed or unclosed), and `<!-- comments -->` are stripped, so the file you might hand to a sponsor never carries your private working notes.

## AI assistants

Transmission to model providers (e.g. Anthropic) is outside fdeops. See that provider’s privacy policy.

## Contact

https://github.com/suboss87/fdeops/issues
