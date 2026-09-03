# Terrain (codebase map)

**Repo:** `kesterman-dispatch` - Java 8 monolith (Maven) + node scripts. First commit 2014. Full day-1 recon: `../../scan-output.txt` (fde scan, 2026-06-10).

**Stack:** .java:180 .js:56 .json:41 .yml:33 files. Postgres 11. Deploys: Jenkins, roughly weekly.

**Hotspots (handle with care):**

- `DispatchBoardService.java` - 47 commits/90d, no test neighbor. Everything routes through it.
- `RouteAssigner.java` - 31 commits/90d, no tests. Contains the hardcoded 2021 carrier-priority hack.
- `scripts/nightly_export.js` - finance depends on its exact output; no tests; FTP password hardcoded (flagged to K. Mroz 2026-06-11, ticket open).

**Test gaps:** 4 test files across 236 code files at scan time (2026-06-10). Characterisation tests added since: `nightly_export.js` (2026-06-20), board write path (2026-06-24) - written before touching either.

## Operating map (exception-led)

| Exception / break | Who notices first | What they do today (workaround) | System of record then | Blast if wrong | Evidence |
|-------------------|-------------------|---------------------------------|-----------------------|----------------|----------|
| Board and sheet disagree on a load | Dispatcher on shift, within the hour | Trust the sheet; fix the board by hand after the shift | The ops sheet | Wrong carrier assigned; Nashville depot double-booked | Floor walk 2026-06-12, Randy Teague |
| Nightly export fails or changes shape | Finance controller, next morning | Re-run the script by hand; email finance the file | Finance's copy of the export | Month-end billing slips | Karen Mroz 2026-06-11; ticket open |
| Dual read path returns stale rows | Nobody, until a dispatcher argues with the board | Refresh and hope | Whichever path answered | Silent data race on write-back | Karen Mroz review 2026-06-24 |

**Shadow systems / silent workarounds:** the ops sheet is dispatch. The board is the copy.
**Sacred / untouchable in ops:** nightly export format and schedule; Randy's macro column until replaced.
**Previous attempt residue:** 2023 ops-api migration, abandoned; both read paths still live.

**Landmines:**

- Dual read path left by the abandoned 2023 ops-api migration - both still live, reverts in git history.
- `DispatchBoardService.java:214` - 2019 "temporary" Nashville validation skip. Load-bearing; out of scope.
- Sheet macro column: VLOOKUP chain only Randy fully understands. Mapped 2026-06-24.
