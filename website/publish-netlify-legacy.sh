#!/usr/bin/env bash
# Creates a private Castward repository and publishes ONLY the existing fishing-atlas site.
# No credentials are included. Login happens through GitHub/Netlify's normal browser flows.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
MODE="${1:---all}"
case "$MODE" in --all|--check|--github-only|--deploy-only) ;; *) echo 'Usage: bash publish.sh [--all|--check|--github-only|--deploy-only]' >&2; exit 2;; esac
OWNER=owensto
REPO=owensto/castward
SITE_ID=a84b0fa4-100f-4219-b6e0-ca9f6c2cb6d5
SITE_NAME=fishing-atlas
ORIGIN=https://fishing-atlas.netlify.app
[ -f .castward-release ] || { echo 'Wrong directory: release marker is missing.' >&2; exit 1; }
for cmd in python3 node; do command -v "$cmd" >/dev/null || { echo "Install $cmd before running this script." >&2; exit 1; }; done
mkdir -p test-results
# Keep private local config out of builds and commits. Environment variables are the deployment inputs.
# The release test intentionally builds a .invalid origin, then restores preview mode.
python3 scripts/compile_release.py
python3 scripts/build.py
node --test tests/engine.test.cjs tests/world-engine.test.cjs > test-results/planner.txt
python3 tests/static_test.py > test-results/static.txt
python3 tests/release_test.py > test-results/release.txt
SITE_URL="$ORIGIN" python3 scripts/build.py
python3 tests/static_test.py >> test-results/static.txt
python3 scripts/check_publish.py
printf '\nLocal checks passed. Production payload: %s/dist\n' "$ROOT"
[ "$MODE" != --check ] || exit 0
if [ "$MODE" = --all ] || [ "$MODE" = --github-only ]; then
 command -v gh >/dev/null || { echo 'Install GitHub CLI first (macOS: brew install gh). Then rerun.' >&2; exit 1; }
 command -v git >/dev/null || { echo 'Install git first.' >&2; exit 1; }
 if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web
 fi
 LOGIN="$(gh api user --jq '.login')"
 [ "$LOGIN" = "$OWNER" ] || { echo "Wrong GitHub account: expected $OWNER, got $LOGIN. Switch accounts and rerun." >&2; exit 1; }
 gh auth setup-git --hostname github.com
 if [ ! -d .git ]; then git init -b main; fi
 [ "$(git branch --show-current)" = main ] || { echo 'Expected local main branch; not changing other branches.' >&2; exit 1; }
 # Set identity in this isolated repository only, if none is already configured.
 git var GIT_AUTHOR_IDENT >/dev/null 2>&1 || {
  git config --local user.name 'Castward release automation'
  git config --local user.email 'castward-release@users.noreply.github.com'
 }
 if git remote get-url origin >/dev/null 2>&1; then
  REMOTE="$(git remote get-url origin)"
  case "$REMOTE" in https://github.com/owensto/castward|https://github.com/owensto/castward.git|git@github.com:owensto/castward.git) ;; *) echo 'Unexpected existing Git remote. Stopping without changing it.' >&2; exit 1;; esac
 fi
 git add .castward-release .gitignore README.md START-HERE.md publish.sh config.example.json package.json netlify.toml public scripts src tests research launch dist
 if ! git diff --cached --quiet; then git commit -m 'Prepare Fishing Atlas continental release and controlled publishing workflow'; fi
 if ! gh repo view "$REPO" --json nameWithOwner >/dev/null 2>&1; then
  gh repo create "$REPO" --private --description 'Castward Fishing Atlas: researched guides, trip preparation, and continental catalog'
 fi
 gh repo view "$REPO" --json nameWithOwner,isPrivate --jq 'if .nameWithOwner == "owensto/castward" and .isPrivate then .nameWithOwner else error("Expected private owensto/castward repository") end'
 git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$REPO.git"
 # Never force-push. A conflicting remote safely rejects this operation.
 git push --set-upstream origin main
 printf '\nGitHub source uploaded: https://github.com/%s\n' "$REPO"
fi
[ "$MODE" != --github-only ] || exit 0
command -v npx >/dev/null || { echo 'Install Node.js including npm/npx first.' >&2; exit 1; }
node -e 'if (Number(process.versions.node.split(".")[0]) < 20) { console.error("Node.js 20 or newer is required."); process.exit(1); }'
mkdir -p .netlify
# .netlify is excluded from Git. Never copy login tokens into source files.
npx --yes netlify-cli@latest login
npx --yes netlify-cli@latest api getSite --data "{\"site_id\":\"$SITE_ID\"}" > .netlify/site-preflight.json
python3 - <<'PY'
import json
from pathlib import Path
s=json.loads(Path('.netlify/site-preflight.json').read_text())
assert s['id']=='a84b0fa4-100f-4219-b6e0-ca9f6c2cb6d5', 'Unexpected Netlify project'
assert s['name']=='fishing-atlas', 'Unexpected Netlify site name'
bs=s.get('build_settings') or {}
if bs.get('repo_url') or bs.get('repo_path'):
 raise SystemExit('This site now has Git continuous deployment. Stopping: a manual upload could be replaced by its next Git build. Use that linked workflow instead.')
print('Confirmed existing Fishing Atlas target; unrelated sites will not be touched.')
PY
npx --yes netlify-cli@latest deploy --no-build --prod --context production --site "$SITE_ID" --dir "$ROOT/dist" --message 'Fishing Atlas continental release' --json > .netlify/last-deploy.json
python3 scripts/check_publish.py --live
printf '\nPublished and verified: %s\nRepository (if --all was used): https://github.com/%s\n' "$ORIGIN" "$REPO"
