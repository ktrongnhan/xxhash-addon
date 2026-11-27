#!/usr/bin/env bash
set -euo pipefail

if [ "$DRY_RUN" = true ] || git diff --quiet -- package.json package-lock.json CHANGELOG.md; then
  echo 'ready=true' >> "$GITHUB_OUTPUT"
  exit 0
fi
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
RELEASE_BRANCH="release/v$RELEASE_VERSION"
git switch -c "$RELEASE_BRANCH"
git add package.json package-lock.json CHANGELOG.md
REMOTE_HEAD=$(git ls-remote --heads origin "refs/heads/$RELEASE_BRANCH")
if [ -n "$REMOTE_HEAD" ]; then
  git fetch origin "refs/heads/$RELEASE_BRANCH"
  RELEASE_COMMIT=$(git rev-parse FETCH_HEAD)
  if [ "$(git write-tree)" != "$(git rev-parse "$RELEASE_COMMIT^{tree}")" ]; then
    echo "::error::Existing $RELEASE_BRANCH differs from the expected release source and metadata."
    exit 1
  fi
  git reset --soft "$RELEASE_COMMIT"
else
  git commit -m "Release v$RELEASE_VERSION"
  git push origin "HEAD:refs/heads/$RELEASE_BRANCH"
fi
printf 'Prepare package versions and changelog for v%s.\n\nRequested by [release workflow](%s/%s/actions/runs/%s).\n' \
  "$RELEASE_VERSION" "$GITHUB_SERVER_URL" "$GITHUB_REPOSITORY" "$GITHUB_RUN_ID" > "$RUNNER_TEMP/release-pr.md"
RELEASE_PR=$(gh pr list --base master --head "$RELEASE_BRANCH" --state open --json url --jq '.[0].url // empty')
if [ -z "$RELEASE_PR" ]; then
  RELEASE_PR=$(gh pr create --base master --head "$RELEASE_BRANCH" \
    --title "Release v$RELEASE_VERSION" --body-file "$RUNNER_TEMP/release-pr.md")
fi
gh pr merge "$RELEASE_PR" --squash --delete-branch --match-head-commit "$(git rev-parse HEAD)"
# A new run makes npm provenance identify the committed release source.
gh workflow run release.yml --ref master -f version="$RELEASE_VERSION" -f dry_run=false
echo 'ready=false' >> "$GITHUB_OUTPUT"
printf '\nMetadata merged: %s\n\nPublishing continues automatically in a new [Release run](%s/%s/actions/workflows/release.yml).\n' \
  "$RELEASE_PR" "$GITHUB_SERVER_URL" "$GITHUB_REPOSITORY" >> "$GITHUB_STEP_SUMMARY"
