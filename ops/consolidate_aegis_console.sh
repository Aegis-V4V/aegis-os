#!/usr/bin/env bash
# ==============================================================================
# consolidate_aegis_console.sh — aegis-console Monorepo Consolidation
#
# Execution Environment: chantecler-01 VPS (Native Linux)
# ==============================================================================

set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

REPO="aegis-console"
SRC_AEGIS_OS="/home/aewoodyard/repos/aegis-os"
SRC_AEGIS_POD_BOT="/home/aewoodyard/repos/aegis-pod-bot"
SRC_SS_AEGIS="/home/aewoodyard/repos/ss-aegis-os-space"

TARGET_DIR="/home/aewoodyard/repos/aegis-console"
BRANCH_NAME="refactor/aegis-console-monorepo-consolidation"

echo "=== STAX Fleet Monorepo Consolidation: Aegis Console ==="
echo "Repo:          ${REPO}"
echo "Target Dir:    ${TARGET_DIR}"
echo "Branch:        ${BRANCH_NAME}"
echo "========================================================"

# 1. Rename aegis-os to aegis-console if not already renamed
if [ -d "${SRC_AEGIS_OS}" ] && [ ! -d "${TARGET_DIR}" ]; then
    echo "==> Renaming aegis-os to aegis-console..."
    mv "${SRC_AEGIS_OS}" "${TARGET_DIR}"
fi

cd "${TARGET_DIR}"

git checkout main || git checkout master
git checkout -B "${BRANCH_NAME}"

TMP_DIR="$(mktemp -d /tmp/aegis-console-consolidation-XXXXXX)"
echo "Staging directory: ${TMP_DIR}"

# 2. Filter aegis-pod-bot into apps/discord-bot
echo "==> Filtering aegis-pod-bot into apps/discord-bot..."
git clone "${SRC_AEGIS_POD_BOT}" "${TMP_DIR}/aegis-pod-bot-staging"
(
    cd "${TMP_DIR}/aegis-pod-bot-staging"
    git tag -l | while read -r tag; do
        if [ -n "$tag" ]; then
            git tag "discord-bot/${tag}" "$tag"
            git tag -d "$tag"
        fi
    done
    git-filter-repo --to-subdirectory-filter apps/discord-bot --force
)

# 3. Filter ss-aegis-os-space into web/portal
echo "==> Filtering ss-aegis-os-space into web/portal..."
git clone "${SRC_SS_AEGIS}" "${TMP_DIR}/ss-aegis-staging"
(
    cd "${TMP_DIR}/ss-aegis-staging"
    git tag -l | while read -r tag; do
        if [ -n "$tag" ]; then
            git tag "portal/${tag}" "$tag"
            git tag -d "$tag"
        fi
    done
    git-filter-repo --to-subdirectory-filter web/portal --force
)

# 4. Merge all remotes sequentially
echo "==> Merging aegis-pod-bot history..."
git remote add remote-discord-bot "${TMP_DIR}/aegis-pod-bot-staging"
git fetch remote-discord-bot
git merge remote-discord-bot/main --allow-unrelated-histories -m "chore: merge aegis-pod-bot into apps/discord-bot with full commit history" --no-edit || git merge remote-discord-bot/master --allow-unrelated-histories -m "chore: merge aegis-pod-bot into apps/discord-bot with full commit history" --no-edit
git remote remove remote-discord-bot

echo "==> Merging ss-aegis-os-space history..."
git remote add remote-ss-aegis "${TMP_DIR}/ss-aegis-staging"
git fetch remote-ss-aegis
git merge remote-ss-aegis/main --allow-unrelated-histories -m "chore: merge ss-aegis-os-space into web/portal with full commit history" --no-edit || git merge remote-ss-aegis/master --allow-unrelated-histories -m "chore: merge ss-aegis-os-space into web/portal with full commit history" --no-edit
git remote remove remote-ss-aegis

rm -rf "${TMP_DIR}"

# 5. Restructure aegis-os into apps/aegis-os and packages/podcast-namespace
echo "==> Restructuring aegis-os root into apps/aegis-os..."
mkdir -p apps/aegis-os packages

if [ -d "podcast-namespace-main" ]; then
    git mv podcast-namespace-main packages/podcast-namespace
fi

for f in server.js api.js data_pipeline.js db.js leaderboards.js module_manager.js poller.js reaper.js scout.js spider.js schema.js schema.sql download_db.js init_brain.js init_pg.js check_schema.js sparky_link.js test_api.js fetch_known_feeds.js brain_api.py scout.py reaper.py audit_brain.py package.json package-lock.json; do
    if [ -f "$f" ]; then
        git mv "$f" apps/aegis-os/
    fi
done

for d in frontend scripts; do
    if [ -d "$d" ]; then
        git mv "$d" apps/aegis-os/
    fi
done

for s in aegis-brain-api.service aegis-scout.service; do
    if [ -f "$s" ]; then
        mkdir -p ops
        git mv "$s" ops/
    fi
done

echo "============================================================"
echo "SUCCESS: aegis-console commit histories merged!"
echo "============================================================"
