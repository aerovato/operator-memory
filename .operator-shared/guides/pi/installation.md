# Pi Packages, Installation, and Updates

Last Updated: September 15, 2026

Verified from `<reference>/pi/packages/coding-agent/docs/packages.md`. Distribution model for extensions, skills, prompt templates, and themes.

## Sources

- `npm:@scope/pkg@1.2.3` — versioned specs are pinned and skipped by updates. Installs run `npm install` (prod only by default), landing in `~/.pi/agent/npm/` (global) or `.pi/npm/` (project).
- `git:github.com/user/repo@ref` (plus raw `https://`/`ssh://` URLs) — refs are pinned tags/commits; updates reconcile the clone to the configured ref (reset, clean, reinstall) but never move to newer refs. Cloned to `~/.pi/agent/git/<host>/<path>` or `.pi/git/<host>/<path>`.
- Local paths — absolute or relative to the settings file; no copying. A file loads as one extension; a directory loads via package rules. This is the local-development path (alternative: `pi -e` for a temporary per-run install).

## Commands

- `pi install <spec>` / `pi remove <spec>` — writes user settings (`~/.pi/agent/settings.json`); `-l` writes project settings (`.pi/settings.json`). Project packages auto-install on startup after trust.
- `pi update --extensions` — update packages and reconcile git refs; `--all` also updates the pi CLI; `pi update npm:@foo/bar` updates one package.
- `pi list`, `pi config` (TUI enable/disable of resources; Tab switches global/project).

## Package manifest

- `"pi"` field in `package.json`: `extensions`, `skills`, `prompts`, `themes` arrays of globs relative to the package root, supporting `!exclusions`; `video`/`image` for gallery preview; `pi-package` keyword for the gallery.
- Without a manifest, convention directories auto-discover: `extensions/` (`.ts`/`.js`), `skills/` (`SKILL.md` folders, top-level `.md`), `prompts/` (`.md`), `themes/` (`.json`).

## Dependencies

- Runtime deps go in `dependencies`; installs use production mode, so `devDependencies` are unavailable at runtime.
- Pi core packages (`pi-ai`, `pi-agent-core`, `pi-coding-agent`, `pi-tui`, `typebox`) are bundled by pi — declare them as `peerDependencies` with `"*"`, never bundle.
- Other pi packages must be bundled: `dependencies` plus `bundledDependencies`, referenced through `node_modules/` paths in the manifest.

## Settings filtering and dedup

- Object form in `packages` filters a package's resources: globs, `!pattern` excludes, `+path`/`-path` exact force-include/exclude, `[]` loads none. Filters narrow the manifest.
- Same package in both global and project settings: project wins unless it sets `autoload: false` (applied as delta). Identity: npm name, git URL without ref, resolved absolute path.
