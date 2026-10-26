# BizToolLab production recovery

**Status:** Procedure only. This document does not authorize a push, a deployment, a database restore, or a Hostinger change.
**Checked:** 26 October 2026, in the local repository at `C:\Projects\biztoollab`.

## Release references

| Role | Commit | Subject |
|---|---|---|
| Current production Git revision | `530a733d6e0ed267d498c44c873df4779bf18ace` | `fix(homepage): improve mobile navigation and category links` |
| Planned release commit | `664980ac95327e2ae7eb9f8d99eb31ce18d056d7` | `feat(blog): launch BizToolLab Insights with three educational guides` |

`origin/main` is `530a733d6e0ed267d498c44c873df4779bf18ace`. Local `main` is four commits ahead:

1. `7e92d3b6e9350d70e294b34c10161895b1a99f48` — homepage Growth logo
2. `59aa865f4e6dbe168e0b2e4ebc19405859fc895c` — liquidity calculation engine and tests
3. `19aee81fce7233a74ec46a59b0559d499624f254` — public canonicals, sitemap `lastModified` removal, Next.js 16.4.1
4. `664980ac95327e2ae7eb9f8d99eb31ce18d056d7` — BizToolLab Insights

Both the production revision and the planned release commit exist locally. On 26 October 2026 the production revision was checked out with `git worktree add --detach` into a temporary worktree. That worktree’s `HEAD` was `530a733d6e0ed267d498c44c873df4779bf18ace`. The development worktree stayed on `664980ac95327e2ae7eb9f8d99eb31ce18d056d7`, and the temporary worktree was removed.

## How deployment behaves

**Confirmed**

- The operator states that Hostinger automatically deploys changes pushed to GitHub.
- Live responses on 25 October 2026 identified the site as Hostinger (`platform: hostinger`, `panel: hpanel`, `server: hcdn`).
- The live site at that time matched the production revision’s public behavior: 15 sitemap URLs, `lastModified` present, no `/blog` routes, no self-referencing canonicals, and no Growth logo.
- This repository contains no Hostinger deployment manifest, build command, branch setting, or rollback command.

**Assumptions, not confirmed by repository evidence**

- That Hostinger deploys `main` specifically, rather than another branch.
- That a successful GitHub push produces a successful Hostinger build.
- That a failed Hostinger build leaves the previous deployment in place.
- That Hostinger clears its CDN or the Next.js cache when a deployment finishes. Live pages were served with `Cache-Control: s-maxage=31536000`.

A push to GitHub can start an automatic deployment. It does not prove that Hostinger built, published, or cached the intended revision. Recovery is complete only when the live site matches the checks below.

## Safe application recovery

Use this only after the planned release has been pushed and a recovery deployment is separately authorized. Until that push happens, production remains on the current revision and no recovery commit is required.

Do not force-push, hard-reset `main`, or rewrite the four release commits. Do not check out the production revision in the development worktree. Recovery adds new commits on top of the release so the development history stays reachable.

From a clean `main` that already contains `664980ac95327e2ae7eb9f8d99eb31ce18d056d7`:

```bash
git switch main
git revert --no-edit 530a733d6e0ed267d498c44c873df4779bf18ace..664980ac95327e2ae7eb9f8d99eb31ce18d056d7
git diff --stat 530a733d6e0ed267d498c44c873df4779bf18ace HEAD
```

The range reverts the four release commits, newest first, and leaves `530a733d6e0ed267d498c44c873df4779bf18ace` in history. The diff against that production revision must be empty before any push. Do not stage `biztoollab-insights-sprint.zip` or `biztoollab-insights-sprint/`.

On 26 October 2026 this revert was applied with `--no-commit` in a detached temporary worktree at the planned release. The resulting tree matched `530a733d6e0ed267d498c44c873df4779bf18ace`, and that worktree was removed. `main` was not changed.

If `main` later contains commits after the planned release, revert only that same four-commit range. Stop if Git reports a conflict. Resolve the conflict so the tree matches the production revision, or leave the recovery unpushed. Do not use `git reset --hard` or `git push --force` to get past the conflict.

An authorized `git push origin main` is a new deployment request. Hostinger may deploy it automatically. Push success is not evidence that the live site recovered.

## Prerequisites and limitations

- Both reference commits must still be present locally, and the production revision must still be the commit Hostinger last published.
- The recovery commit must be created on `main` and pushed only with explicit authorization.
- The procedure restores application source. It does not restore Hostinger settings, DNS, TLS, the GitHub connection, CDN cache, or the database.
- Cached HTML can keep the released pages visible after the recovered revision is built.
- If later work edited the same files, the revert can conflict even though it applied cleanly on 26 October 2026.
- The untracked sprint package is not part of either reference commit. A GitHub deployment does not include it. A manual upload of the working tree could.

## Verification after a recovery deployment

Check the live site after Hostinger finishes. These are the public signs of the production revision, recorded on 25 October 2026:

- `https://biztoollab.com/` returns 200 and does not include the Growth logo or an Insights link.
- `https://biztoollab.com/calculators`, `/calculators/break-even-calculator`, `/calculators/profit-margin-calculator`, and `/calculators/laundromat-profit-calculator` return 200.
- `https://biztoollab.com/sitemap.xml` lists 15 URLs, includes `lastModified`, and does not list `/blog`.
- `https://biztoollab.com/blog` and the three article URLs return 404.
- `https://biztoollab.com/robots.txt` allows `/` and points to `https://biztoollab.com/sitemap.xml`.

Repeat the checks against `https://www.biztoollab.com/` as well. On 25 October 2026 the `www` host returned the same homepage entity as the apex and did not redirect. This recovery does not change that host behavior.

## When Hostinger support is required

Contact Hostinger if any of these happen after the recovery push:

- GitHub accepted the push, but the live checks still show the planned release.
- The Hostinger build fails or stays in progress.
- The public site returns server errors.
- The GitHub deployment connection is disconnected or requires a manual rebuild that is not available.
- The host reports the recovered deployment as complete, but cached pages still show the released site.

Do not try to repair a failed Hostinger build by rewriting Git history.

## Database

Do not restore the database for this recovery.

The four release commits contain no database migration and no destructive database change. They do not add, alter, or drop tables. Restoring a MySQL backup is unnecessary and can discard admin governance records, experiments, implementation plans, recommendations, and Search Console snapshots created after that backup.

Application recovery is the Git revert above. Database restore is a separate, explicitly authorized operation and is not part of this plan.
