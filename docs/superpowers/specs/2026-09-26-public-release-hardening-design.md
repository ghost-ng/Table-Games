# Table Games Public Release Hardening Design

## Objective

Prepare Table Games for public source visibility and reliable local use from WSL while preserving the current application behavior. The repository will remain non-open-source: visitors may inspect the source, but reuse, modification, redistribution, and commercial use are prohibited without written permission from `ghost-ng`.

The completed repository must support a new contributor or reviewer starting from a clean WSL checkout with Node.js 22, installing deterministic dependencies, running the development server, producing and previewing the offline PWA build, and executing the complete verification suite.

## Current State

- The GitHub repository is private, has no description, homepage, or license, and GitHub Pages is not enabled.
- The Pages workflow builds successfully but deployment returns HTTP 404 because Pages is disabled.
- `package.json` contains working development, build, preview, typecheck, and unit-test commands, but there is no public README or documented clean-install workflow.
- The WSL `node` executable is version 18 while the release workflow uses Node 22. The repository does not declare or pin its supported Node version.
- The dependency lockfile is deterministic, but the audit reports transitive advisories in the Expo build toolchain, including one critical advisory. Compatible patch updates must be attempted without crossing the Expo 55 major boundary.
- The repository contains internal implementation-plan documents, stale EAS submit placeholders, legacy asset candidates, and line-ending noise in the local checkout.
- Local and Git-history secret-pattern scans found no likely credentials or private keys.

## Release Policy and Licensing

Create a proprietary `LICENSE` notice with copyright held by `ghost-ng`, dated 2026, and an explicit All Rights Reserved statement. The notice must state that copying, modification, distribution, sublicensing, and commercial use require prior written permission.

`package.json` must keep `private: true` and declare `license: "UNLICENSED"` so npm cannot publish the package accidentally. The README must repeat the no-reuse summary and link to the full license.

The repository may accept security reports through GitHub's private vulnerability reporting mechanism. The release does not promise public contribution rights or an open-source contribution workflow.

## WSL Toolchain Contract

The supported local environment is WSL 2 or a compatible Linux shell with:

- Node.js 22.x;
- npm 10 or newer;
- Git;
- Bash.

Add `.nvmrc` containing `22` and a package engine constraint for Node 22. The setup documentation should recommend `nvm install && nvm use` and must not require a globally installed Expo CLI.

Add executable scripts under `scripts/wsl/`:

- `install.sh`: locate the repository root, validate Node 22 and npm availability, and run `npm ci`.
- `build.sh`: validate the toolchain, run verification, then create the production PWA. Accept an optional base path through `EXPO_BASE_URL` without embedding a host-specific value.
- `run.sh`: start either the development server or the built PWA preview. Default to development mode; support `preview` plus an optional port.
- `verify.sh`: run unit tests, TypeScript checking, and the production build in a fail-fast sequence.

Scripts must use `set -euo pipefail`, quote paths containing spaces, resolve the repository root relative to their own file location, and produce actionable error messages. npm aliases should expose the same common operations without duplicating their implementation.

## Package and Dependency Policy

Add clear package metadata: description, repository URL, issue URL, homepage, supported engine, package manager, and `UNLICENSED` license identifier.

Stay on Expo SDK 55 and React 19.2 for this release. Apply only compatible patch/minor updates accepted by Expo 55 and regenerate `package-lock.json` deterministically. Do not use `npm audit fix --force` and do not cross to Expo 57 or a different React Native major as part of repository cleanup.

After compatible updates:

- run `npm audit --omit=dev`;
- record unresolved transitive build-tool advisories in the release report with their dependency paths and runtime relevance;
- fail CI for test, type, or build regressions, but do not add an audit gate that makes a known Expo-transitive advisory block every contribution.

## Public Documentation and Repository Layout

Create a concise public `README.md` covering:

- product overview and supported games/tools;
- offline-first PWA behavior;
- WSL prerequisites;
- clean installation, development, verification, build, preview, and GitHub Pages commands;
- project architecture and where game engines, screens, themes, persistence, and PWA code live;
- privacy and local-storage behavior;
- current limitations, including mocked monetization and the documented Word Grid timed pass-device defect;
- proprietary license notice.

Create `SECURITY.md` describing supported versions, private vulnerability reporting, and a warning not to post credentials in public issues.

Add `.editorconfig` and `.gitattributes` so text uses LF endings consistently while fonts and images remain binary. This prevents the current WSL/Windows line-ending churn.

Remove internal Superpowers design/plan documents and `CLAUDE.md` after transferring durable architecture and command information into the README. Remove the placeholder `submit.production.ios` account block from `eas.json`; native builds remain supported, but account-specific submission data must not ship as fake public configuration.

Remove only asset files proven to have no source, configuration, documentation, or build references. Retain generated Hangman progression assets and all current theme/game imagery. Record every removed asset in the implementation report.

## Continuous Integration and Deployment

Add a CI workflow for pushes and pull requests that uses Node 22, `npm ci`, unit tests, TypeScript checking, and a production PWA build. Use maintained official action versions verified during implementation.

Update the Pages workflow to use the same Node and verification contract, configure Pages explicitly, build with `EXPO_BASE_URL=/${{ github.event.repository.name }}`, upload `dist/`, and deploy through GitHub's Pages action. Preserve the waiting-worker behavior: a new service worker must not activate until the user selects Restart.

Add weekly Dependabot checks for npm and GitHub Actions, with conservative grouping that avoids surprise major framework upgrades.

After all source changes are committed and pushed:

1. update the GitHub repository description, homepage, and relevant topics;
2. change visibility from private to public;
3. enable GitHub Pages with `build_type=workflow`;
4. trigger or rerun the Pages workflow;
5. verify the deployed project URL and at least one deep game route.

These external changes are authorized by the user but occur only after local verification passes.

## Verification and Acceptance Criteria

The implementation is complete only when all of the following are true:

1. A clean temporary checkout under a path containing spaces can run the WSL installer successfully with Node 22.
2. `npm ci` leaves the lockfile unchanged.
3. `npm run test:unit`, `npm run typecheck`, and `npm run build` pass.
4. The WSL build and verification wrappers pass and fail clearly when Node is unsupported.
5. The preview server serves home, a deep game route, the manifest, icons, service worker, and all seven Hangman images.
6. An online-seeded browser can reload home and a representative game offline.
7. Repository scans find no committed secrets, placeholder account IDs, generated build output, Playwright scratch data, or internal planning artifacts.
8. The public README commands work exactly as written.
9. GitHub Actions CI passes on the final commit.
10. GitHub Pages deploys successfully and the live URL renders the PWA under the repository base path.

## Non-Goals

- Migrating from Expo SDK 55 to Expo 57.
- Replacing AsyncStorage, the router, or the service-worker design.
- Changing game rules, scoring, AI behavior, themes, or visual layouts.
- Implementing real advertising, in-app purchases, App Store submission, or Play Store submission.
- Rewriting Git history to remove large files unless a confirmed secret or legally restricted asset requires it.
- Granting an open-source license or general reuse permission.
