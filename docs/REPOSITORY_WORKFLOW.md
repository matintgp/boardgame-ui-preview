# BoardGame preview — repository-first workflow

## Source of truth
`main` in this repository is the deployed **frontend-only** demo and should be edited directly through versioned commits/PRs. Vercel deploys changes from GitHub automatically.

## Existing deployment
- The currently committed frontend in this repository is Salem V2 at `/`.
- The integrated BoardGame V14 (home, chess, mafia, Salem) has **not** yet been committed in full. Do not claim it is online until `/salem/`, `assets/mafia.js`, and main BoardGame page all exist and their build passes.
- Original BoardGame backend and production Next.js app are untouched.

## Future updates
- Text source (HTML, CSS, JS, TS, SVG, configuration): publish directly via the GitHub connector.
- Large binary artwork assembled in the assistant's isolated local runtime is **not automatically available** to the GitHub connector. Its bytes must be transferred by a supported file-capable mechanism, or regenerated/managed in the Git repository. Do not imply binary artifacts have been uploaded without verification.
- Avoid archive handoffs or manually uploading ZIPs as the ongoing development workflow.
- Preserve the established Chess/Mafia visual design and existing role art during migration.
- Before announcing a release, verify commit, deployment status, image paths, and browser smoke tests.

## Deployment
Vercel project: `boardgame-ui-preview`.
Git branch: `main`.
Framework: static / Other (no build command required for standalone demo).
