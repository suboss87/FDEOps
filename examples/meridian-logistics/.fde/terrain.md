# Terrain (codebase map)

**Repo:** `meridian-dispatch` - Java 8 monolith (Maven) + node scripts. First commit 2014. Full day-1 recon: `../../scan-output.txt` (fde scan, 2026-06-10).

**Stack:** .java:180 .js:56 .json:41 .yml:33 files. Postgres 11. Deploys: Jenkins, roughly weekly.

**Hotspots (handle with care):**

- `DispatchBoardService.java` - 47 commits/90d, no test neighbor. Everything routes through it.
- `RouteAssigner.java` - 31 commits/90d, no tests. Contains the hardcoded 2021 carrier-priority hack.
- `scripts/nightly_export.js` - finance depends on its exact output; no tests; FTP password hardcoded (flagged to Priya 2026-06-11, ticket open).

**Test gaps:** 4 test files across 236 code files at scan time (2026-06-10). Characterisation tests added since: `nightly_export.js` (2026-06-20), board write path (2026-06-24) - written before touching either.

**Landmines:**

- Dual read path left by the abandoned 2023 ops-api migration - both still live, reverts in git history.
- `DispatchBoardService.java:214` - 2019 "temporary" Nashville validation skip. Load-bearing; out of scope.
- Sheet macro column: VLOOKUP chain only Marcus fully understands. Mapped 2026-06-24.
