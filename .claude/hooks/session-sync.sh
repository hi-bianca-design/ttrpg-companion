#!/usr/bin/env bash
# SessionStart: safe, read-only parts of /sync. Never deletes, resets, or pushes.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

git fetch --all --prune --quiet 2>&1 | tail -3
# Fast-forward local main without checking it out; refuses (not clobbers) if it can't.
ff=$(git fetch origin main:main 2>&1 | tail -1)

branch=$(git branch --show-current)
read -r ahead behind < <(git rev-list --left-right --count HEAD...origin/main 2>/dev/null)
dirty=$(git status --porcelain | wc -l | tr -d ' ')
gone=$(git branch -vv | grep -c ': gone]')
stashes=$(git stash list | wc -l | tr -d ' ')

echo "Auto-sync ran at session start (fetch --prune, main fast-forward attempted)."
echo "- branch: ${branch:-detached}; ${ahead:-?} ahead / ${behind:-?} behind origin/main; $dirty uncommitted file(s)"
echo "- local branches whose remote is gone: $gone; stashes: $stashes"
[ -n "$ff" ] && echo "- main fast-forward note: $ff"
echo "Do not re-run /sync or offer it. Mention the state only if it's relevant (behind main, gone branches, dirty tree). Don't delete anything without a clear yes."
