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
- Ambient sync or background polling of email, Slack, Granola, or any other source

## Ingest (optional MCP sink)

The optional ingest MCP (`mcp/fdeops-ingest`) and `fde ingest` CLI verbs **stage local files only** - raw pulls land in `<engagement>/.inbox/` beside the fieldbook. Third-party **source** MCPs (Gmail, Granola, Notion, custom) are **user-configured** in your AI tool; they are outside fdeops and carry their own credentials and privacy terms. fdeops never stores those credentials and does not call those services from the core CLI.

Nothing enters `.fde/` without your confirm step (`fde ingest apply`). There is no ambient sync: pulls happen when you (or your agent on your instruction) fetch and stage.

**`.inbox/` is NDA surface** - same home tree as `~/fde-engagements/<name>/.fde/`. Cloud sync, backup, and permissions guidance above applies to staged raw artifacts too.

## Your data

Engagement notes may include sensitive business information. You control storage, backup, and sharing. fdeops does not encrypt or police commits for you.

## Your engagements folder is your NDA surface

fdeops deliberately moves engagement memory **out of the client's repo** into `~/fde-engagements/` on your machine - that is the design, and it has a consequence you must own: whatever syncs or backs up your home directory now carries client-derived notes (branch names, commit messages, uncommitted filenames from the session-end hook; stakeholder observations you log yourself).

Concretely:

- **Cloud sync.** If `~/fde-engagements` resolves inside iCloud Drive, Dropbox, OneDrive, or Google Drive (e.g. via a relocated home folder or an `FDEOPS_ENGAGEMENT` override), your engagement notes leave the machine. `fde resume --init` warns when it detects this; heed it. Exclude the folder from sync, or move it.
- **Personal backups.** Time Machine, Backblaze, and similar back up `~/fde-engagements` by default. If your NDA obliges specific handling of client-derived material, add the folder to your backup exclusions or use an encrypted volume.
- **Permissions.** `chmod 700 ~/fde-engagements` keeps other local accounts out.
- **End of engagement.** The record is plain files: hand the `.fde/` folder to the client as the engagement record, archive it per your contract, or delete it - `rm -rf ~/fde-engagements/<client>` removes everything, verifiably. Backups, exports, and the shared alias dictionary can retain copies; handle those separately.

Notes about identifiable people (stakeholder signals, contact logs) may carry data-protection obligations (e.g. GDPR) in your jurisdiction. Dated, factual, evidence-backed entries - which is what the skill enforces - are what your own counsel would ask you for; retention and deletion are your responsibility.

## The fieldbook dashboard

`fde dashboard` renders your engagements into a local `fieldbook.html` (default `~/fde-engagements/fieldbook.html`). It is a static file - no server, no network calls, works offline. Anything inside a `<private>…</private>` block in your `.fde/` notes is **redacted** from the rendered page (closed or unclosed), and `<!-- comments -->` are stripped, so the file you might hand to a sponsor never carries your private working notes.

## AI assistants

Transmission to model providers (e.g. Anthropic) is outside fdeops. See that provider’s privacy policy.

`<private>` tags are an operational boundary plus CLI redaction: `fde resume`, `fde prep`, `fde dashboard`, receipts, and hook-injected context strip them. Opening the raw markdown with an agent file tool bypasses that redaction - keep secrets out of those tools and out of prompts.

## Contact

https://github.com/suboss87/fdeops/issues

## Default identifier masking

CLI text responses, pending smart-debrief proposals, and ingest MCP tool responses mask common email addresses, international/US phone formats, SSN-shaped identifiers, and supported credential patterns before an AI host receives them. This is local pattern matching, not an LLM call or complete PII detection. Names, company names, postal addresses, and unrecognized formats are not automatically hidden. Continue marking sensitive prose with `<private>`.

Aliases are stable within an engagements root. Originals remain in local records; confirmed writes restore recognized aliases locally. Unknown or incomplete aliases and missing/corrupt alias state refuse the operation. A legacy pending proposal is masked when reviewed; do not have an agent open old proposals before `fde debrief --review` succeeds. Legacy proposals with inline private blocks are refused and must be recreated through the smart-proposal path.

The reversible dictionary is stored at `<engagements-root>/.privacy/identifiers.json`, outside normal client ledgers, with restrictive local permissions. It contains sensitive originals, is not encrypted, and must never be loaded into an agent, shared, or committed. Protect it with the same storage and backup controls as your records. Do not remove it while pending proposals or retained aliases still need to resolve. Removing a client folder does not remove its dictionary entries; include this shared dictionary in retention planning.

Masking does not change original record files or intercept your AI host. Raw file reads, pasted chat, and upstream MCP content may already reach a provider. Local dashboard and vault files are intended for human use and retain unmarked identifiers by default. The reports option in `fde setup --settings` also masks supported identifier patterns in newly generated report content; it does not rewrite old exports, remove names automatically, or make reports safe AI context. Handoff packets generated through the CLI are masked. Masked text can still identify someone through surrounding context.


Custom mode in `fde setup` also masks the names or terms you explicitly supply locally. Matching is literal and case-insensitive at word boundaries, not automatic name detection. Add variants separately. The list lives in `<engagements-root>/.preferences.json` with owner-only file permissions where supported; setup inspection returns only its count. It is not encrypted. Keep it out of shared folders, Git, model context and public reports. Standard mode retains the list but disables its matching; replacing the list does not erase historical records or alias dictionary entries. Protection applies to FDEOps-supplied text, not raw file tools or chat. Masking reduces exposure, not responsibility for deciding what may be shared.
