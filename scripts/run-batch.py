#!/usr/bin/env python3
"""
Send code-fix tasks to a local Qwen model via llama.cpp's OpenAI-compatible API.

Usage:
  # In worktree A (machine-a):
  cd ../psi-fixes-batch-a
  python3 scripts/run-batch.py --host <HOST_A> tasks/batch-a.json

  # In worktree B (machine-b):
  cd ../psi-fixes-batch-b
  python3 scripts/run-batch.py --host <HOST_B> tasks/batch-b.json

Options:
  --port PORT        llama.cpp port (default: 8080)
  --max-tokens N     max response tokens (default: 4096)
  --dry-run          show prompts without calling the model
  --no-commit        apply edits but skip git commits
  --resume           skip tasks whose title already appears in git log
"""

import argparse, json, os, re, subprocess, sys, urllib.request, datetime

SYSTEM_PROMPT = """\
You are an expert Astro/web developer fixing bugs in a site. You will receive a source file and one or more issues to fix.

Output ONLY search/replace edit blocks in this exact format:

<<<<<<< SEARCH
exact existing lines to find (must match the file exactly, including whitespace)
=======
replacement lines
>>>>>>> REPLACE

Rules:
- SEARCH text must match the file character-for-character (indentation, quotes, etc.)
- Output as many blocks as needed to fix ALL listed issues
- Make minimal, targeted changes — only fix the described issues
- Do NOT add comments explaining your changes
- Do NOT output any thinking, explanation, or text other than search/replace blocks
"""

LOG_DIR = "logs"


def log(msg, logfile=None):
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    if logfile:
        logfile.write(line + "\n")
        logfile.flush()


def call_model(host, port, messages, max_tokens):
    url = f"http://{host}:{port}/v1/chat/completions"
    body = json.dumps({
        "model": "qwen",
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": max_tokens,
        "stream": False,
    }).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=3600) as r:
        data = json.loads(r.read())
    return data["choices"][0]["message"]["content"]


def parse_blocks(text):
    """Extract (search, replace) pairs from the model's response."""
    return re.findall(
        r"<<<<<<< SEARCH\n(.*?)\n=======\n(.*?)\n>>>>>>> REPLACE",
        text, re.DOTALL,
    )


def apply_blocks(filepath, blocks):
    """Apply search/replace blocks to a file. Returns new content or None on failure."""
    content = open(filepath, encoding="utf-8").read()
    for i, (search, replace) in enumerate(blocks, 1):
        if search in content:
            content = content.replace(search, replace, 1)
        else:
            # Try matching with trailing-whitespace stripped on each line
            s_lines = "\n".join(l.rstrip() for l in search.split("\n"))
            c_lines = "\n".join(l.rstrip() for l in content.split("\n"))
            if s_lines in c_lines:
                # Re-apply on the stripped version, then that becomes our content
                c_lines = c_lines.replace(s_lines, replace, 1)
                content = c_lines
            else:
                return None, i
    return content, 0


def committed_titles(branch=None):
    """Return set of commit-message first lines on current branch."""
    cmd = ["git", "log", "--format=%s"]
    if branch:
        cmd.append(branch)
    try:
        out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)
        return set(out.strip().splitlines())
    except Exception:
        return set()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("task_file", help="JSON task file (e.g. tasks/batch-a.json)")
    ap.add_argument("--host", required=True, help="llama.cpp server IP")
    ap.add_argument("--port", default="8080", help="llama.cpp server port (default 8080)")
    ap.add_argument("--max-tokens", type=int, default=16384, help="max response tokens")
    ap.add_argument("--dry-run", action="store_true", help="print prompts, don't call model")
    ap.add_argument("--no-commit", action="store_true", help="apply edits, skip git commit")
    ap.add_argument("--resume", action="store_true", help="skip tasks already committed")
    args = ap.parse_args()

    os.makedirs(LOG_DIR, exist_ok=True)
    logpath = os.path.join(LOG_DIR, f"batch-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}.log")
    logfile = open(logpath, "w", encoding="utf-8")

    tasks = json.load(open(args.task_file, encoding="utf-8"))
    done_titles = committed_titles() if args.resume else set()

    log(f"Loaded {len(tasks)} tasks from {args.task_file}", logfile)
    log(f"Target: http://{args.host}:{args.port}", logfile)
    log(f"Log: {logpath}", logfile)
    log("", logfile)

    ok = fail = skip = 0

    for i, t in enumerate(tasks, 1):
        title = t["title"]
        commit_msg = f"fix: {title}"

        if args.resume and commit_msg in done_titles:
            log(f"[{i}/{len(tasks)}] SKIP (already committed): {title}", logfile)
            skip += 1
            continue

        log(f"[{i}/{len(tasks)}] {title}", logfile)

        fpath = t["file"]
        full = os.path.join(os.getcwd(), fpath)
        if not os.path.exists(full):
            log(f"  File not found: {fpath}", logfile)
            fail += 1
            continue

        src = open(full, encoding="utf-8").read()

        # Build prompt
        prompt = f"## Issue: {title}\n\n{t['description']}\n\n"

        # Include optional extra context files
        for ctx in t.get("context_files", []):
            ctx_full = os.path.join(os.getcwd(), ctx)
            if os.path.exists(ctx_full):
                ctx_src = open(ctx_full, encoding="utf-8").read()
                # Truncate huge files to first 200 lines
                lines = ctx_src.splitlines()
                if len(lines) > 200:
                    ctx_src = "\n".join(lines[:200]) + f"\n... ({len(lines) - 200} more lines)"
                prompt += f"### Reference file: {ctx}\n```\n{ctx_src}\n```\n\n"

        prompt += f"### File to edit: {fpath}\n```\n{src}\n```"

        if args.dry_run:
            log(f"  [dry-run] prompt={len(prompt)} chars, ~{len(prompt)//4} tokens", logfile)
            continue

        log(f"  Sending to model ({len(prompt)} chars)...", logfile)

        # Save prompt to log
        logfile.write(f"\n--- PROMPT for task {i} ---\n{prompt}\n--- END PROMPT ---\n\n")
        logfile.flush()

        try:
            resp = call_model(
                args.host, args.port,
                [{"role": "system", "content": SYSTEM_PROMPT},
                 {"role": "user", "content": prompt}],
                args.max_tokens,
            )
        except Exception as e:
            log(f"  ERROR from model: {e}", logfile)
            fail += 1
            continue

        # Save response to log
        logfile.write(f"\n--- RESPONSE for task {i} ---\n{resp}\n--- END RESPONSE ---\n\n")
        logfile.flush()

        blocks = parse_blocks(resp)
        if not blocks:
            log(f"  No search/replace blocks parsed from response", logfile)
            fail += 1
            continue

        result, failed_block = apply_blocks(full, blocks)
        if result is None:
            log(f"  FAILED: block {failed_block}/{len(blocks)} could not match file", logfile)
            fail += 1
            continue

        open(full, "w", encoding="utf-8").write(result)
        log(f"  Applied {len(blocks)} edit(s) to {fpath}", logfile)

        if not args.no_commit:
            subprocess.run(["git", "add", fpath], check=True)
            subprocess.run(["git", "commit", "-m", commit_msg], check=True)
            log(f"  Committed: {commit_msg}", logfile)

        ok += 1
        log("", logfile)

    log(f"Done: {ok} success, {fail} failed, {skip} skipped (of {len(tasks)} tasks)", logfile)
    logfile.close()
    print(f"\nFull log: {logpath}")


if __name__ == "__main__":
    main()
