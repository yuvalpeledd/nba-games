# Decisions

One file per non-obvious choice: the decision, why, and when to revisit, in a few lines.
What was built and how it was checked go in the commit message.

- **A new decision is a new file**, `YYYY-MM-DD-<slug>.md` (its title as the slug), so parallel branches never edit the same file.
  Never insert it into another; to change course, add a new one that links the old.
- **Its shape:** `# <title>`, the date on a line of its own, then its bullets, one sentence per line.
- **Linking another:** by its file name (`[the rosters](2026-11-13-rosters-by-day-team-players.md)`), never "the entry below".
- The file names sort by date; within a day, `git log` has the order.
