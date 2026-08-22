# Dedicated database cutover

    Run this only after importing the repository into a separate Replit project with its own built-in PostgreSQL database.

    ## Never commit private migration material

    Database dumps, lead records, provider configuration, webhook payloads, Gmail identifiers, consent evidence, owner mappings, credentials, and environment files must not enter GitHub. Use encrypted temporary transfer or a controlled direct database connection, then delete transfer artifacts after verification.

    ## Sequence

    1. Configure the destination project's managed Clerk instance, workflows, integrations, and Secrets.
    2. Apply migrations through 0010 in the destination database.
    3. Freeze lead writes, provider jobs, webhooks, Gmail draft actions, and prospect generation in the source.
    4. Create a private explicit old-Clerk-ID to new-Clerk-ID owner mapping. Email is only a matching aid.
    5. Export referenced users, compatibility website/project rows, preview roots, and all lead-domain tables in one consistent snapshot. Preserve domain IDs.
    6. Import owner roots, preview and website roots, leads, sources, scores, activities, suppressions, prospect sites, generations, previews, outreach drafts/events/opt-outs, provider records, and channel consents.
    7. Rewrite owner IDs once using the private mapping. Do not rewrite lead, website, prospect, generation, preview-mapping, draft, or event IDs.
    8. Reconfigure provider and webhook credentials in the destination rather than copying them from database exports.
    9. Compare per-table counts and checksums without printing contents. Validate foreign keys, owner isolation, opt-outs, consent, Gmail reconciliation, and lead-to-prospect-to-website-to-preview chains.
    10. Run signed-in desktop/mobile tests in the destination. Resume writes only after a final delta import or confirmed zero-write freeze.
    11. Remove temporary lead routes and tables from SiteForge only after destination verification and a rollback checkpoint.

    Until validation passes, SiteForge's database remains the source of truth.
    