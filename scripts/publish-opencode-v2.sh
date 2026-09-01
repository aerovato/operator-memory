#!/bin/sh

set -eu

requested_version=${1:-}

if [ -z "$requested_version" ]; then
  printf '%s\n' 'Usage: bun run publish:opencode-v2 -- <major|minor|patch|version>' >&2
  exit 1
fi

current_version=$(node -p 'require("./packages/opencode-v2/package.json").version')
version=$(sh scripts/resolve-publish-version.sh "$current_version" "$requested_version")

tag="opencode-v2@v$version"
package="@aerovato/operator-opencode-v2"
branch=$(git symbolic-ref --quiet --short HEAD || true)
if [ "$branch" != "main" ]; then
  printf 'Release must run from main; current branch: %s\n' "${branch:-detached HEAD}" >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  printf '%s\n' 'Release requires a clean worktree and staging area.' >&2
  exit 1
fi
if git rev-parse --verify --quiet "refs/tags/$tag" >/dev/null; then
  printf 'Release tag already exists locally: %s\n' "$tag" >&2
  exit 1
fi
remote_tag=$(git ls-remote --tags origin "refs/tags/$tag")
if [ -n "$remote_tag" ]; then
  printf 'Release tag already exists on origin: %s\n' "$tag" >&2
  exit 1
fi
published_version=$(npm view "$package@$version" version 2>/dev/null || true)
if [ "$published_version" = "$version" ]; then
  printf 'Package version already exists on npm: %s@%s\n' "$package" "$version" >&2
  exit 1
fi

bun run check packages/opencode-v2
bun run build:opencode-v2
(cd packages/opencode-v2 && npm pack --dry-run)

npm version "$version" --no-git-tag-version --workspaces=false --prefix packages/opencode-v2
bun install --lockfile-only --ignore-scripts

git add "bun.lock" "packages/opencode-v2/package.json"
git commit -m "opencode-v2@v$version"
git tag "$tag"
git push --atomic origin main "$tag"
