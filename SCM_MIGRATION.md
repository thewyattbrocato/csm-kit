# GitLab to GitHub delivery record

This record captures the 2026-09-17 reconciliation and the operating rules while
GitLab remains authoritative.

## Forge inventory before publication

- Source: <https://gitlab.com/wcbrocato/csm-kit> (`git@gitlab.com:wcbrocato/csm-kit.git`), public, default branch `main`.
- Destination: <https://github.com/thewyattbrocato/csm-kit> (`https://github.com/thewyattbrocato/csm-kit.git`), public, default branch `main`.
- GitLab ordinary refs: `main` at `d7a432e1f833eca0e6469e1938feb5e58c69e35a`; no tags.
- GitHub ordinary refs before reconciliation:

| Branch | SHA | Reachability from GitLab `main` |
|---|---|---|
| `main` | `39aa15362ba06080a6870393f80eb09006bb0d9c` | ancestor, 27 commits behind |
| `fm/csmkit-demo-web-t7` | `609622d6bd0bf29fa564031846bff6ecec263c8e` | not reachable, 3 unique commits |
| `fm/csmkit-onboard-v5` | `bd12edffa0a8833d5756d3009621a4560038013e` | not reachable, 3 unique commits |
| `fm/csmkit-v01-b5` | `6c8b798594f739e88a2629db5a9f0738c8e42b41` | ancestor |
| `fm/csmkit-v02-c8` | `f72240b13ac9ff567909c65a33ddfc77a429c04f` | not reachable, 4 unique commits |
| `fm/csmkit-visuals-r4` | `464c1a0420caa331f193c4ba5a8ce7aebc6a96c4` | not reachable, 2 unique commits |

GitHub had no tags. The live GitLab API reported no open merge requests and the
live GitHub API reported no open pull requests. Old destination branches may
still matter even without open reviews, so none were deleted or rewritten.

## Reconciliation result

After the preservation steps below were verified, GitHub `main` was
fast-forwarded without force from `39aa15362ba06080a6870393f80eb09006bb0d9c`
to `d7a432e1f833eca0e6469e1938feb5e58c69e35a`. A fresh live snapshot then
confirmed:

- GitLab and GitHub both resolve `HEAD` to `refs/heads/main` at
  `d7a432e1f833eca0e6469e1938feb5e58c69e35a`.
- GitLab still has exactly one ordinary branch (`main`) and no tags. GitHub has
  the same source branch tip and no tags.
- All five original GitHub-only branch names still point to their original
  SHAs, and all six archival refs point to the recorded pre-sync SHAs.
- GitLab refs, the local `origin`, CI ownership, and Pages ownership were not
  changed.

## Preservation

Before updating any existing GitHub ref, all six pre-reconciliation GitHub
branch tips were written to `migration/github-pre-sync-20260917.bundle`. The
bundle includes only `refs/migration/github/heads/*` copies of the destination
branches, and `git bundle verify` succeeded. Its SHA-256 is recorded below.

GitHub also retains collision-safe archival branches under
`archive/github-pre-sync-20260917/`. Their suffixes include the original tip SHA,
and the original branches remain untouched:

| Archive branch | Preserved SHA |
|---|---|
| `archive/github-pre-sync-20260917/main-39aa15362ba0` | `39aa15362ba06080a6870393f80eb09006bb0d9c` |
| `archive/github-pre-sync-20260917/fm-csmkit-demo-web-t7-609622d6bd0b` | `609622d6bd0bf29fa564031846bff6ecec263c8e` |
| `archive/github-pre-sync-20260917/fm-csmkit-onboard-v5-bd12edffa0a8` | `bd12edffa0a8833d5756d3009621a4560038013e` |
| `archive/github-pre-sync-20260917/fm-csmkit-v01-b5-6c8b798594f7` | `6c8b798594f739e88a2629db5a9f0738c8e42b41` |
| `archive/github-pre-sync-20260917/fm-csmkit-v02-c8-f72240b13ac9` | `f72240b13ac9ff567909c65a33ddfc77a429c04f` |
| `archive/github-pre-sync-20260917/fm-csmkit-visuals-r4-464c1a0420ca` | `464c1a0420caa331f193c4ba5a8ce7aebc6a96c4` |

Bundle SHA-256: `359559d2c00eddd2115ab0c712b4490430d06c542a928d1974db34b904146b28`

## Delivery ownership and gaps

- `origin` remains GitLab. GitLab `main` is the only authoritative integration
  branch; GitHub is a delivery mirror, not a second merge target.
- GitLab CI owns verification and production Pages deployment. The `pages` job
  in `.gitlab-ci.yml` publishes `docs/` only from GitLab `main`. The public demo
  URLs and README badges continue to point at GitLab. GitHub Pages is disabled.
- The pre-reconciliation GitHub tree had a GitHub Actions workflow. GitLab later
  replaced it with `.gitlab-ci.yml`, so the reconciled GitHub tree has no Actions
  workflow. GitHub therefore does not provide an independent required check;
  successful GitLab CI is the delivery gate.
- Neither forge has repository releases or deployments recorded. GitLab has no
  package-registry entries. The repository has no lockfile, `.npmrc`,
  `publishConfig`, release automation, Git LFS attributes, or submodules. The
  public npm name `csm-kit` belongs to an unrelated package, so this project must
  not publish to that name.

## Reversible dual delivery

After GitLab CI succeeds on authoritative `main`, refresh both live ref
inventories and push only explicitly named, source-confirmed ordinary refs. For
the current inventory that is:

```console
$ git fetch origin main
$ git fetch https://github.com/thewyattbrocato/csm-kit.git main
$ git merge-base --is-ancestor FETCH_HEAD origin/main
$ git push --atomic https://github.com/thewyattbrocato/csm-kit.git origin/main:refs/heads/main
```

Tags, when they exist, must be compared by name and object SHA before each tag
is pushed explicitly. Do not use `--mirror`, `--all`, force, deletion, wildcard
refspecs, or forge-internal refs. Do not push local work branches as part of
delivery. A same-name destination ref that is not an ancestor of its GitLab ref
is a stop condition, not a reason to overwrite it.

This path is reversible because it changes no GitLab ref, remote, CI setting, or
Pages setting, and because every prior GitHub tip has both bundle and remote
archive coverage. Recovery can branch from an archive or restore its objects
locally without rewriting `main`; moving `main` backward requires an explicit
cutover decision and must not be forced under this procedure.

## Cutover prerequisites

Do not make GitHub authoritative until all of these are explicit decisions:

- Choose the canonical clone URL and update README links and badges.
- Recreate equivalent required CI on GitHub and observe it green.
- Choose and validate the production Pages owner and URL; preserve redirects if
  the public URL changes.
- Inventory open work again and either merge or deliberately archive every
  GitLab-only branch and merge request.
- Define tag and release ownership, package naming, credentials, branch
  protection, and rollback authority.
- Change developer remotes and automation only after SHA parity is re-verified.
