# Adapter Release Checklist

End-to-end requirements for shipping an Operator adapter package. `implementation.md` defines the adapter contract; this defines everything else required to reach a published, documented, installable release. Read both before starting any adapter. This checklist covers contributor work only; versioning, publishing, and Helper releases are handled by a maintainer.

## Package

- Adapter contract satisfied per `implementation.md` and `specs/<harness>/implementation.md`.
- `packages/<pkg>/package.json`: `@aerovato/operator-<pkg>` name, `exports`, `files`, peer dependencies, `prepack` build, `publishConfig.access: public`, harness metadata, license, repo directory.
- `tsconfig.check.json` so `bun run check packages/<pkg>` works; tests in `packages/<pkg>/test/`.
- Build script plus root `build:<pkg>` script.
- `packages/<pkg>/README.md` — required before publishing; npm renders it as the package page. Mirror the Codex README shape: what it is, install, verify, commands, update, link to `docs/harnesses/<harness>.md`.

## Helper

- `operator-helper install <harness>` command with CLI registration and tests.
- Modify helper package `README.md` to add new harness installation command.
- Update `packages/helper/src/templates/project/shared-readme.ts` install block: add the new harness and keep ordering in sync with the root `README.md` harness table.

## Documentation

- `docs/harnesses/<harness>.md`: install, verify, commands, update, troubleshooting.
- Root `README.md`; `docs/troubleshooting.md` entry.
- Shared index: `.operator-shared/index/<pkg>.md` subindex (quote frontmatter descriptions starting with `@`), main index package listing and architecture sentence.

## Release Automation

- `scripts/publish-<pkg>.sh` and `.github/workflows/publish-<pkg>.yml` mirroring the Codex pipeline, plus root `publish:<pkg>` script. A maintainer executes the actual release.
