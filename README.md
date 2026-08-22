# LeadForge

    LeadForge is the standalone lead operations workspace extracted from SiteForge. It covers qualified lead management, provenance-aware facts and scoring, suppression and permanent opt-out, prospect lifecycle, owner-reviewed outreach drafts, Gmail draft creation, WhatsApp consent/template preparation, discovery-provider controls, quotas, and provider audit activity.

    ## Repository state

    This private repository is the safe cutover snapshot. The LeadForge frontend is active and tested in the source Replit workspace. The API and database packages are included so the separate Replit project can be provisioned and cut over without deleting the source data first.

    The API package still contains shared compatibility code required by the current prospect lifecycle. Remove that compatibility code only after the dedicated-database import and prospect-reference verification are complete.

    ## Run in Replit

    Create a new Replit project by importing this private repository. Replit will provision that project with its own PostgreSQL database.

    Install dependencies:

      pnpm install

    Run the API workflow:

      pnpm --filter @workspace/api-server run dev

    Run the LeadForge web workflow:

      pnpm --filter @workspace/leadforge run dev

    The web app uses the PORT and BASE_PATH environment values supplied by its Replit workflow, and falls back to port 3000 at the root path for a plain local run.

    ## Required configuration

    Configure Clerk and provider integrations in the new project through Replit-managed Auth, Integrations, and Secrets. Never paste keys into source files or commit them to GitHub.

    ## Database cutover

    Do not delete the source LeadForge tables yet. Follow docs/DATABASE_CUTOVER.md after the new project and its Clerk users exist. Lead data and identity mappings are intentionally excluded from this repository.

    ## Safety invariants

    - Gmail actions create drafts only; they never send email.
    - WhatsApp stays consent-gated and provider-gated.
    - Permanent outreach opt-out remains irreversible through ordinary controls.
    - Imported facts do not silently become owner-provided facts.
    - Owner review and current eligibility are required before external draft actions.
    