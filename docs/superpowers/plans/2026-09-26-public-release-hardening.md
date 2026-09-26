# Table Games Public Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Table Games safe to expose publicly, reproducible from WSL with Node 22, continuously verified, and deployable to GitHub Pages while retaining proprietary no-reuse terms.

**Architecture:** Keep the application and Expo 55 runtime intact. Add a thin WSL release-tooling layer around the existing npm/PWA pipeline, make public policy and repository metadata explicit, update only compatible dependencies and official workflow actions, then prove the result from an isolated checkout before changing GitHub visibility or Pages settings.

**Tech Stack:** Bash, Node.js 22, npm, Expo SDK 55, React Native Web, GitHub Actions, GitHub Pages, Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-09-26-public-release-hardening-design.md`

## Global Constraints

- The repository is source-visible but proprietary: copyright `ghost-ng`, 2026, All Rights Reserved; no reuse, modification, redistribution, sublicensing, or commercial use without written permission.
- Keep `private: true` and set `license: "UNLICENSED"`; never make the package publishable to npm.
- Support WSL 2 or compatible Linux with Node 22.x, npm 10+, Git, and Bash; do not require a global Expo CLI.
- Stay on Expo SDK 55 and React 19.2. Do not use `npm audit fix --force` or migrate to Expo 57/React Native 0.87.
- Preserve game rules, AI, persistence, routes, visual behavior, service-worker waiting semantics, and the intentionally generic UI names.
- Preserve unrelated local changes. The current tracked dirty files are line-ending-only when compared with `--ignore-space-at-eol`; stage exact task files.
- Use LF for text and mark images/fonts as binary. Do not create generated build, Playwright, or dependency artifacts in Git.
- External GitHub mutations happen only after local and clean-checkout verification pass. The user has authorized making `ghost-ng/Table-Games` public and enabling Pages.

## Review Focus

- A repository path containing spaces must not break root discovery, quoting, `npm ci`, build, or preview commands; Task 1 tests all WSL wrappers from such a path.
- An unsupported Node version must fail before dependency or build mutation with an actionable Node 22 message; Task 1 tests the failure branch.
- GitHub project-site base paths and deep links must preserve manifest, service-worker scope, assets, and SPA fallback; Tasks 3 and 5 build and probe `/Table-Games/`.
- Public release must not expose credentials, placeholder account IDs, generated artifacts, or internal planning files; Tasks 2 and 4 scan the complete tracked tree and history.
- A deployment update must remain waiting until the user selects Restart; Tasks 3 and 5 inspect source and exercise a real waiting-worker update.

---

## Task 1: Add the WSL Toolchain Contract and Local Commands

**Files:**
- Create: `.nvmrc`
- Create: `.editorconfig`
- Create: `.gitattributes`
- Create: `scripts/wsl/lib.sh`
- Create: `scripts/wsl/install.sh`
- Create: `scripts/wsl/build.sh`
- Create: `scripts/wsl/run.sh`
- Create: `scripts/wsl/verify.sh`
- Create: `scripts/wsl/wsl-scripts.test.mjs`
- Create: `scripts/clean.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `repo_root()`, `require_command(name)`, and `require_node_22()` Bash helpers used by every WSL script.
- Produces: public commands `./scripts/wsl/install.sh`, `build.sh`, `run.sh [dev|preview] [port]`, and `verify.sh`.
- Consumes: existing npm commands `test:unit`, `typecheck`, `build`, `preview`, and `start`.

- [ ] **Step 1: Add failing WSL wrapper tests**

Create Node built-in tests named:

- `all WSL scripts parse under bash and are executable`;
- `wrappers resolve a repository path containing spaces`;
- `toolchain validation rejects Node 18 with a Node 22 instruction`;
- `run mode rejects unknown values without starting Expo`;
- `preview mode forwards an explicit numeric port`.

Use temporary fake `node`/`npm` executables and `spawnSync`; no network or installed dependencies are required.

- [ ] **Step 2: Run the tests and confirm the red state**

Run: `node --test scripts/wsl/wsl-scripts.test.mjs`

Expected: FAIL because the WSL scripts/helpers do not exist.

- [ ] **Step 3: Add the toolchain files and npm metadata**

Set `.nvmrc` to `22`. Add Node `>=22 <23`, npm `>=10`, package manager `npm@11.4.2`, `private: true`, `license: "UNLICENSED"`, description, repository, bugs, and homepage metadata.

Add npm aliases:

- `dev`: current web development server;
- `verify`: unit tests followed by typecheck and build;
- `test:wsl`: the Node built-in WSL wrapper tests;
- `verify:all`: WSL wrapper tests followed by `verify`;
- `build:pages`: build using `EXPO_BASE_URL=/Table-Games`;
- `clean`: `node scripts/clean.mjs`, limited to the exact repository-owned `dist/` and `.expo/` directories after validating their resolved paths.

Implement the four executable Bash entry points using `set -euo pipefail` and the shared helper. `build.sh` accepts the base path from `EXPO_BASE_URL`; `run.sh` defaults to `dev`, supports `preview`, and validates its port.

- [ ] **Step 4: Run WSL wrapper tests and syntax checks**

Run: `node --test scripts/wsl/wsl-scripts.test.mjs && bash -n scripts/wsl/*.sh`

Expected: PASS, including path-with-spaces and Node-version failure cases.

- [ ] **Step 5: Verify package JSON without changing dependencies**

Run: `npm pkg get private license engines packageManager scripts`

Expected: private/UNLICENSED, Node 22, npm 10+, and all named commands.

- [ ] **Step 6: Commit Task 1**

```bash
git add .nvmrc .editorconfig .gitattributes package.json scripts/clean.mjs scripts/wsl
git commit -m "build: add WSL release commands"
```

## Task 2: Add Public Policy, Documentation, and Safe Tree Cleanup

**Files:**
- Create: `LICENSE`
- Create: `README.md`
- Create: `SECURITY.md`
- Create: `scripts/public-readiness.mjs`
- Modify: `package.json`
- Modify: `eas.json`
- Delete: `assets/pieces/checker-black.png`
- Delete: `assets/pieces/checker-red.png`
- Delete: `assets/pieces/disc-red.png`
- Delete: `assets/pieces/disc-yellow.png`
- Delete: `assets/pieces/hangman-full.png`
- Delete: `assets/splash-icon.png`
- Delete: `assets/textures/wood-table.png`

**Interfaces:**
- Consumes: Task 1's exact WSL and npm command names.
- Produces: public onboarding, security-reporting instructions, and enforceable repository-level no-reuse notice.

- [ ] **Step 1: Write documentation assertions**

Create `scripts/public-readiness.mjs` and expose it as `npm run check:public`. The checker exits nonzero unless:

- `LICENSE` contains `All Rights Reserved`, `ghost-ng`, and the prohibited-use categories;
- README lists all twelve generic game names and both tools without using trademarked alternatives in user-facing lists;
- every documented local command exists in `package.json` or `scripts/wsl/`;
- SECURITY links GitHub private vulnerability reporting and warns against public credential disclosure;
- no `YOUR_APPLE_ID`, `YOUR_ASC_APP_ID`, or `YOUR_TEAM_ID` remains.
- no forbidden tracked artifact or likely credential pattern is present. It rejects `dist`, `node_modules`, `.expo`, `.playwright-*`, `.env*`, `CLAUDE.md`, and `docs/superpowers` unless the temporary `--allow-internal-plans` flag is used.

Run it first and confirm failure because files/placeholders are missing/present.

- [ ] **Step 2: Create the public license and README**

Write the proprietary license defined by the spec. Document product features, WSL Node 22 setup, clean install, development, verification, production build, preview, Pages base-path build, architecture, local-only data/privacy, mocked monetization, Word Grid timed handover limitation, and no-reuse policy.

- [ ] **Step 3: Add security policy and remove account placeholders**

Create `SECURITY.md` using GitHub private vulnerability reporting. Remove only the placeholder `submit.production` block from `eas.json`; retain native build profiles.

- [ ] **Step 4: Delete only the seven proven-unreferenced assets**

Before deletion rerun filename searches across `app`, `src`, `app.json`, `public`, `scripts`, and workflows. Delete the seven listed files only when every search is empty. Rebuild later tasks to prove no missing asset.

- [ ] **Step 5: Run documentation and secret checks**

Run: `npm run check:public -- --allow-internal-plans`. Expected: PASS except for the explicitly deferred internal files removed by Tasks 4 and 5. Run current-tree secret patterns separately and expect no likely credentials.

- [ ] **Step 6: Commit Task 2**

```bash
git add LICENSE README.md SECURITY.md eas.json package.json scripts/public-readiness.mjs assets
git commit -m "docs: prepare proprietary public release"
```

## Task 3: Refresh Compatible Dependencies and Continuous Integration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `.github/dependabot.yml`

**Interfaces:**
- Consumes: Task 1's `verify:all` command and Task 2's public base-path instructions.
- Produces: Node 22 CI, deterministic npm installation, compatible Expo 55 dependency set, and Pages workflow using maintained official actions.

- [ ] **Step 1: Capture dependency and workflow baselines**

Run: `npm outdated --json`, `npm audit --omit=dev --json`, and `npm run verify:all` with Node 22.

Record the current advisory counts (29 total: 1 low, 17 moderate, 10 high, 1 critical) and current bundle/PWA version in the task report.

- [ ] **Step 2: Apply Expo-55-compatible updates**

Use Expo's SDK-aware installer or exact compatible ranges to update Expo 55 packages and allowed supporting libraries without changing Expo major, React 19.2, or React Native 0.83. Do not use force. Regenerate the lockfile through npm 11 under Node 22.

- [ ] **Step 3: Verify dependency compatibility**

Run: `npm ci`, `npx expo install --check`, `npm run verify:all`, and `npm audit --omit=dev --json`.

Expected: install/test/type/build PASS; no incompatible Expo packages. Record remaining transitive advisories and whether they are build-time or browser-runtime paths.

- [ ] **Step 4: Add CI and Dependabot**

Create CI for pushes to `master` and pull requests using `actions/checkout@v7`, `actions/setup-node@v7`, Node 22, npm cache, `npm ci`, and `npm run verify:all`.

Configure weekly npm and GitHub Actions Dependabot updates with open-PR limits and no automatic major-version grouping.

- [ ] **Step 5: Update the Pages workflow**

Use `actions/checkout@v7`, `actions/setup-node@v7`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, and `actions/deploy-pages@v5`. Build after `npm ci` and tests with `EXPO_BASE_URL=/${{ github.event.repository.name }}`. Keep Pages permissions, environment URL, and concurrency.

- [ ] **Step 6: Validate workflow syntax and base-path build**

Run `npx --yes prettier@3.6.2 --check .github/**/*.yml .github/**/*.yaml`, `npm run build:pages`, and serve the result. Assert `/Table-Games/manifest.webmanifest`, `/Table-Games/sw.js`, `/Table-Games/games/hangman`, and all seven Hangman assets return 200 with correct scope/base paths.

- [ ] **Step 7: Commit Task 3**

```bash
git add package.json package-lock.json .github
git commit -m "ci: harden public build and deployment"
```

## Task 4: Remove Internal-Only Repository Material

**Files:**
- Delete: `CLAUDE.md`
- Delete: `docs/superpowers/plans/2026-09-26-table-games-visual-refresh.md`
- Delete: `docs/superpowers/specs/2026-09-26-table-games-visual-refresh-design.md`

**Interfaces:**
- Consumes: Task 2 README, which must contain every durable command, architecture, naming, and PWA fact previously found in internal docs.
- Produces: a public tracked tree without agent/session planning documents.

- [ ] **Step 1: Diff durable information before deletion**

Compare README against `CLAUDE.md` and both specs. Fail the cleanup if the README omits generic-name rules, PWA waiting-worker semantics, base-path build, persistence/privacy, game organization, or WSL commands.

- [ ] **Step 2: Delete internal-only files**

Remove the three listed tracked internal files. Keep the current public-release spec and plan until Task 5 has finished using them. Do not delete user/product documentation outside `docs/superpowers`.

- [ ] **Step 3: Scan the public tracked tree**

Run tracked-file checks for `CLAUDE.md`, the old visual-refresh documents, placeholder IDs, secrets, `dist`, `node_modules`, `.expo`, Playwright output, and local environment files. Expected: none tracked. Run `npm run check:public -- --allow-internal-plans`; only the active release spec/plan may be exempted.

- [ ] **Step 4: Commit Task 4**

```bash
git add -u CLAUDE.md docs/superpowers/plans/2026-09-26-table-games-visual-refresh.md docs/superpowers/specs/2026-09-26-table-games-visual-refresh-design.md
git commit -m "chore: remove internal planning artifacts"
```

## Task 5: Prove a Clean WSL Release and Publish It

**Files:**
- Modify only if verification finds defects: files created or changed in Tasks 1–3.
- Create outside repository: temporary clean checkout, browser screenshots, audit report.

**Interfaces:**
- Consumes: the complete public tree and all WSL/CI/PWA commands.
- Produces: verified commits on `master`, public GitHub metadata, enabled Pages, and a live project URL.

- [ ] **Step 1: Verify the current checkout**

Using Node 22, run `npm ci`, confirm `git diff -- package-lock.json` is empty, then run `npm run verify:all`, `git diff --check`, and `git status --short`. Existing unrelated line-ending-only working changes must remain unstaged and semantically unchanged.

- [ ] **Step 2: Verify an isolated checkout under a spaced path**

Create a temporary directory using `mktemp -d`, clone the local repository into a child named `Table Games Public Check`, and use an isolated Node 22 runtime without modifying the user's global WSL installation. Run:

```bash
./scripts/wsl/install.sh
./scripts/wsl/verify.sh
EXPO_BASE_URL=/Table-Games ./scripts/wsl/build.sh
./scripts/wsl/run.sh preview 4173
```

Expected: all commands pass exactly as documented; the lockfile remains unchanged.

- [ ] **Step 3: Run production browser/PWA checks**

Using Playwright CLI, verify home, `/games/tic-tac-toe?mode=multiplayer`, `/games/hangman?mode=multiplayer`, manifest, icons, service worker, deep-link fallback, install metadata, and all seven Hangman images under `/Table-Games/`. Seed online, switch offline, reload home and Hangman, and verify meaningful content. Confirm an update waits until Restart.

- [ ] **Step 4: Run final public-safety scans**

Scan current tracked files and all reachable Git history for credential/private-key patterns. Confirm no placeholder IDs or forbidden artifacts. Run `npm audit --omit=dev` and include unresolved dependency paths in the final report without misrepresenting build-tool findings as shipped browser code.

- [ ] **Step 5: Remove the active release planning artifacts**

Delete `docs/superpowers/plans/2026-09-26-public-release-hardening.md` and `docs/superpowers/specs/2026-09-26-public-release-hardening-design.md`, remove empty internal directories, then run `npm run check:public` without exemptions. Expected: PASS.

Commit the exact deletions:

```bash
git add -u docs/superpowers
git commit -m "chore: remove release planning artifacts"
```

- [ ] **Step 6: Commit verification repairs if needed**

If Tasks 1–3 require fixes, stage exact files and commit:

```bash
git commit -m "fix: complete public release verification"
```

Do not create an empty commit.

- [ ] **Step 7: Push the verified branch**

Fetch `origin`, require `origin/master...master` to have no remote-only commits, then push `master`. Verify local and remote SHAs match.

- [ ] **Step 8: Configure the public repository**

Use GitHub CLI/API to set:

- visibility: public, accepting the visibility-change consequence;
- description: `Offline-first classic table games and tabletop tools for solo and pass-and-play.`;
- homepage: `https://ghost-ng.github.io/Table-Games/`;
- topics: `pwa`, `expo`, `react-native-web`, `offline-first`, `table-games`;
- Pages build type: workflow.

Do not change issue visibility or enable the wiki.

- [ ] **Step 9: Run and verify GitHub Actions**

Trigger CI and Pages if the push did not already do so. Watch both to completion. On failure, inspect logs, repair code/configuration, rerun local checks, commit/push, and retry.

- [ ] **Step 10: Verify the live public site**

Open `https://ghost-ng.github.io/Table-Games/` and a deep link such as `/Table-Games/games/hangman?mode=multiplayer`. Confirm HTTPS, correct asset base paths, manifest/service worker registration, no console/page errors, and offline reload after seeding.

- [ ] **Step 11: Produce the release report**

Report final commit SHA, repository URL/visibility, Pages URL, CI/Pages run URLs, clean-checkout commands, dependency audit counts and limitations, files removed, and remaining known product limitations. Do not commit temporary reports or screenshots.
