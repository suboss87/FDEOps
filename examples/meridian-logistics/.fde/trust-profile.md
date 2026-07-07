# Trust profile

**AI code policy:** AI-assisted code permitted with human review (Priya reviews all PRs). Confirmed with Diana 2026-06-09. No customer PII in the dispatch domain; carrier rate data is commercially sensitive - keep out of prompts.
**Approval chain:** code → Priya review → staging. Production deploys need Diana's ok for the duration of the engagement.
**Data that must never enter AI context:** carrier rate cards, FastLane contract terms, `config/carriers.yml` (rates live next to the API key).

<private>
Diana's cooling may relate to the Nashville depot audit (Marcus's read, 2026-07-02) - politics, keep out of shared artifacts.
</private>
