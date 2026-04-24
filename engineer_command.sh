#!/usr/bin/env bash
# auftragstaktik — autonomous engineering bot launcher
#
# Usage: bash engineer_command.sh [budget_minutes]
#
# Invoked by GeneralStaff's dispatcher. Creates a git worktree,
# installs npm deps, runs claude -p, exits. Cleanup + verification
# handled by dispatcher.

set -euo pipefail

BUDGET_MINUTES="${1:-30}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
WORKTREE_DIR="$PROJECT_ROOT/.bot-worktree"
BRANCH="${GENERALSTAFF_BOT_BRANCH:-bot/work}"

echo "=== auftragstaktik Bot Launcher ==="
echo "Budget: ${BUDGET_MINUTES} min"
echo "Project root: $PROJECT_ROOT"
echo "Worktree: $WORKTREE_DIR"
echo "Branch: $BRANCH"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "================================="

if ! git -C "$PROJECT_ROOT" rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "Creating branch $BRANCH from master..."
  git -C "$PROJECT_ROOT" branch "$BRANCH" master
fi

git -C "$PROJECT_ROOT" worktree prune 2>/dev/null || true

if [ -d "$WORKTREE_DIR" ]; then
  echo "Stale worktree found — removing..."
  git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
  rm -rf "$WORKTREE_DIR" 2>/dev/null || true
fi

echo "Creating worktree at $WORKTREE_DIR on $BRANCH..."
git -C "$PROJECT_ROOT" worktree add "$WORKTREE_DIR" "$BRANCH"

echo "Installing npm deps in worktree..."
cd "$WORKTREE_DIR"
npm install --silent 2>&1 | tail -5 || {
  echo "npm install failed — bot cycle will likely fail verification"
}

echo ""
echo "Launching autonomous claude -p in worktree..."
echo ""

claude -p "You are an autonomous engineering bot working on Auftragstaktik — a public open-source tactical OSINT command terminal (Next.js 15, TypeScript 5.7, MapLibre GL JS, milsymbol, Ollama-default briefings). 3 stars + 1 fork on GitHub. 15 development phases complete; feature-rich but zero test coverage + sparse accessibility + minimal API-response validation. Your job is polish + hardening appropriate to a public project that other devs might fork: tests, type safety, edge cases, accessibility, docs. NOT new features.

## Your environment
Git worktree on $BRANCH. npm deps are installed. Default branch is master. Do NOT touch the main working tree.

## Your task
Read \$GENERALSTAFF_ROOT/state/auftragstaktik/tasks.json. Pick highest-priority pending task that is NOT interactive_only. Work on exactly that task.

## What you can do
- Add tests (jest + next/jest setup from scratch if no test runner exists; or vitest — pick one, document the choice in the commit).
- Add zod schemas for API response validation at fetch boundaries.
- Add aria-labels, role=region landmarks, alt text, keyboard-nav affordances.
- Fix null/undefined edge cases in coordinate transforms, API parsers, data normalizers.
- Add JSDoc / API contract docs.
- Narrow bug fixes discovered during test-writing.
- Commit with imperative-mood message, lowercase task-id prefix.
- Mark task done via GS CLI:

    bun \"\$GENERALSTAFF_ROOT/src/cli.ts\" task done --project=auftragstaktik --task=<task-id>

## What you must NOT do
- Modify any file listed in GeneralStaff's projects.yaml hands_off for auftragstaktik: CLAUDE.md, README.md, SESSION_NOTES.md, DESIGN_SYSTEM_HANDOFF.md, Dockerfile, docker-compose.yml, .env*, public/data/ucdp-ged-filtered.json (6.2MB bundled dataset, don't touch), design tokens / CSS variables / global styles (frozen per Session 6 overhaul).
- Bump existing dep versions.
- Add new feature surface. Every change should be justifiable under 'polish/hardening for a public project'.
- Rewrite the design system. The IBM Plex + navy-slate + blue-accent aesthetic is Ray's frozen call.
- Write marketing / user-facing copy. If a task seems to require that, abandon.

## Verification gate
Run: npm run lint && npm run build

Build must succeed. Lint must not add new warnings/errors. If your task adds a test runner, include the runner's command in the verify step (but the dispatcher will still run lint + build; add your test command to package.json scripts so npm test works after your cycle).

## Style
TypeScript strict (already enabled). Zero 'any' unless justified in the commit body. When adding tests: unit tests for pure logic, integration tests where they catch real regressions. Commit messages: imperative mood, lowercase task-id prefix, one-line summary.

## Budget
${BUDGET_MINUTES} min total. Stop before expiring. One task per invocation.
" \
  --allowedTools "Read,Write,Edit,Bash,Grep,Glob" \
  --dangerously-skip-permissions \
  --mcp-config '{"mcpServers":{}}' \
  --strict-mcp-config \
  --output-format text

echo ""
echo "Bot finished. Exit code: $?"
echo "Ended: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
