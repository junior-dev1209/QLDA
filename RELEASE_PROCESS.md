# Release Process

## Source of truth

`release.json` is the only place to change the frontend and Edge Function version pair. Run `node tools/sync-release-versions.js` after changing it, then `node tools/run-verifications.js`. The sync command only updates known version markers; it does not deploy or modify application behavior. On machines with npm installed, the equivalent package scripts are `npm run release:sync` and `npm test`.

## Checks

Run locally with Node.js:

```powershell
node tools/sync-release-versions.js --check
node tools/run-verifications.js
deno check supabase/functions/kpi-sync/index.ts
```

The Deno command requires Deno 2.7.0 as pinned in `.tool-versions`; GitHub Actions installs that version and runs the Node verification suite plus the Edge Function type check for pull requests and pushes to `main`. Keep the `Quality gates / Verify application and Edge Function` check required before merging.

## Safe deployment

This workflow is intentionally validation-only. It does not deploy to Supabase or the static host. First restore and verify the local Git repository against the existing GitHub repository. Then configure one staging environment and test the same commit there. Only after this is operating reliably should production deployment be automated behind a manual approval. Do not enable Supabase's automatic `main` deployment and a separate production deploy workflow at the same time.

For a release that changes database schema, add and test a migration before production. Do not use the deploy script's migration step for a release that has no new migration; use `-SkipDatabaseMigrations` only after confirming the staging schema is current.

## Rollback

Keep the last known-good frontend files and Edge Function source tied to their commit. If post-deployment smoke checks fail, redeploy that commit and leave schema changes backward-compatible until the rollback window has passed.
