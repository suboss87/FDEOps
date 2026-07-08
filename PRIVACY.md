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

## Your engagements folder is your NDA surface

fdeops deliberately moves engagement memory **out of the client's repo** into `~/fde-engagements/` on your machine - that is the design, and it has a consequence you must own: whatever syncs or backs up your home directory now carries client-derived notes (branch names, commit messages, uncommitted filenames from the session-end hook; stakeholder observations you log yourself).

Concretely:

- **Cloud sync.** If `~/fde-engagements` resolves inside iCloud Drive, Dropbox, OneDrive, or Google Drive (e.g. via a relocated home folder or an `FDEOPS_ENGAGEMENT` override), your engagement notes leave the machine. `fde resume --init` warns when it detects this; heed it. Exclude the folder from sync, or move it.
- **Personal backups.** Time Machine, Backblaze, and similar back up `~/fde-engagements` by default. If your NDA obliges specific handling of client-derived material, add the folder to your backup exclusions or use an encrypted volume.
- **Permissions.** `chmod 700 ~/fde-engagements` keeps other local accounts out.
- **End of engagement.** The record is plain files: hand the `.fde/` folder to the client as the engagement record, archive it per your contract, or delete it - `rm -rf ~/fde-engagements/<client>` removes everything, verifiably. Nothing else holds a copy.

Notes about identifiable people (stakeholder signals, contact logs) may carry data-protection obligations (e.g. GDPR) in your jurisdiction. Dated, factual, evidence-backed entries - which is what the skill enforces - are what your own counsel would ask you for; retention and deletion are your responsibility.

## The fieldbook dashboard

`fde dashboard` renders your engagements into a local `fieldbook.html` (default `~/fde-engagements/fieldbook.html`). It is a static file - no server, no network calls, works offline. Anything inside a `<private>…</private>` block in your `.fde/` notes is **redacted** from the rendered page (closed or unclosed), and `<!-- comments -->` are stripped, so the file you might hand to a sponsor never carries your private working notes.

## AI assistants

Transmission to model providers (e.g. Anthropic) is outside fdeops. See that provider’s privacy policy.

## Contact

https://github.com/suboss87/fdeops/issues
