#!/bin/sh

set -eu

version=${1:-}

if [ -z "$version" ]; then
  printf '%s\n' 'Usage: bun run release:helper -- <version>' >&2
  exit 1
fi

case "$version" in
  *[!0-9.]* | '' | *.*.*.* | .* | *.)
    printf '%s\n' 'Version must be in X.Y.Z format.' >&2
    exit 1
    ;;
esac

old_ifs=$IFS
IFS=.
set -- $version
IFS=$old_ifs

if [ "$#" -ne 3 ] || [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
  printf '%s\n' 'Version must be in X.Y.Z format.' >&2
  exit 1
fi

tag="helper@v$version"
package="@aerovato/operator-helper"
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

bun run check packages/helper
bun run build:helper
(cd packages/helper && npm pack --dry-run)

npm version "$version" --no-git-tag-version --workspaces=false --prefix packages/helper
bun install --lockfile-only --ignore-scripts

git add "bun.lock" "packages/helper/package.json"
git commit -m "helper@v$version"
git tag "$tag"
git push --atomic origin main "$tag"
