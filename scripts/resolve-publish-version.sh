#!/bin/sh

set -eu

current_version=${1:-}
requested_version=${2:-}

validate_version() {
  candidate=$1

  case "$candidate" in
    *[!0-9.]* | '' | *.*.*.* | .* | *.)
      return 1
      ;;
  esac

  old_ifs=$IFS
  IFS=.
  set -- $candidate
  IFS=$old_ifs

  [ "$#" -eq 3 ] && [ -n "$1" ] && [ -n "$2" ] && [ -n "$3" ]
}

if ! validate_version "$current_version"; then
  printf '%s\n' 'Current package version must be in X.Y.Z format.' >&2
  exit 1
fi

case "$requested_version" in
  major | minor | patch)
    old_ifs=$IFS
    IFS=.
    set -- $current_version
    IFS=$old_ifs

    major=$1
    minor=$2
    patch=$3

    case "$requested_version" in
      major)
        major=$((major + 1))
        minor=0
        patch=0
        ;;
      minor)
        minor=$((minor + 1))
        patch=0
        ;;
      patch)
        patch=$((patch + 1))
        ;;
    esac

    printf '%s.%s.%s\n' "$major" "$minor" "$patch"
    ;;
  *)
    version=${requested_version#v}
    if ! validate_version "$version"; then
      printf '%s\n' 'Version must be major, minor, patch, or X.Y.Z.' >&2
      exit 1
    fi
    printf '%s\n' "$version"
    ;;
esac
