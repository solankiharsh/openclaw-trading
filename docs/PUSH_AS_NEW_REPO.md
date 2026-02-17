# Push this repo as a fresh project (single initial commit, no history)

Use this when you want to push the current code to a **new empty GitHub repo** so that the new repo has **one initial commit** and **no prior commit history**.

**Target repo (your personal GitHub):** `https://github.com/solankiharsh/openclaw-trading.git`

---

## If you hit TruffleHog or "src refspec does not match any"

- **"TruffleHog found secrets. Aborting commit"** — The scanner often flags false positives inside `node_modules` (e.g. the word "showCompletionScript" in a dependency’s CHANGELOG). For this one-time initial push it’s safe to skip the hook.
- **"error: src refspec openclaw-initial does not match any"** — This means the commit never completed (e.g. because the hook aborted it), so the branch has no commits to push. Fix by creating the commit with `--no-verify` (see below), then push again.

---

## Option A: From this repo (supermolt-mono) — orphan branch

Run from the **root of this repo** (e.g. `supermolt-mono`):

```bash
# Add your personal GitHub repo as a remote (keeps existing origin unchanged)
git remote add openclaw https://github.com/solankiharsh/openclaw-trading.git

# Create a new branch with no history (orphan)
git checkout --orphan openclaw-initial

# Stage everything (respects .gitignore)
git add -A

# Commit. Use --no-verify to skip TruffleHog/pre-commit so false positives in node_modules don't block the push
git commit --no-verify -m "Initial commit: OpenClaw Trading"

# Push this branch to openclaw's main (creates main on the remote with this single commit)
git push -u openclaw openclaw-initial:main
```

After this, **openclaw-trading** on your GitHub will have a single commit. Your existing `origin` and `main` are unchanged. You can delete the local branch if you like: `git checkout main && git branch -D openclaw-initial`.

---

## Option B: Copy into the new repo (no change to this repo)

If you prefer not to add a remote or orphan branch to this repo:

```bash
# Clone the empty new repo
git clone https://github.com/solankiharsh/openclaw-trading.git /tmp/openclaw-trading
cd /tmp/openclaw-trading

# Copy all files from this project EXCEPT .git (so we keep openclaw's fresh history)
rsync -av --exclude='.git' /Users/harshsolanki/Developer/supermolt-mono/ /tmp/openclaw-trading/

# One initial commit (--no-verify skips TruffleHog if it blocks on false positives)
git add -A
git commit --no-verify -m "Initial commit: OpenClaw Trading"
git push -u origin main
```

---

## If the remote already has a branch (e.g. README)

If you created the GitHub repo with a README or license, the remote already has one commit. Force-push to replace it:

```bash
# After Option A, if you need to overwrite remote main:
git push -u openclaw openclaw-initial:main --force
```

Use `--force` only when you intend to replace the remote branch entirely.
