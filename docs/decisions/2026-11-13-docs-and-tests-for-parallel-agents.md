# Docs and tests for agents working in parallel

2026-11-13

- **Nearly every merge conflicted in the docs, rarely in code**, because every branch edited the same lines: the top of `decisions.md` (newest first), `CLAUDE.md`'s "Scaffolded so far", the backlog's "Next" line, each a paragraph-long line.
  So, as asked:
  a decision is a file of its own (`docs/decisions/`), the docs hold one sentence per line, and `CLAUDE.md` and the rules keep no lists every change appends to (what exists is the repo's to say).
- **The specs' database is per checkout** (`nba_test_<folder>`, created on first use), as asked: two worktrees' specs sharing `nba_test` rebuilt each other's schema mid-run ("relation teams does not exist").
- **Not done yet:** the backlog to GitHub issues, waiting on which account opens them (the CLI's isn't the repo owner's).
  Revisit `merge=union` in `.gitattributes` if a shared append-only file comes back.
