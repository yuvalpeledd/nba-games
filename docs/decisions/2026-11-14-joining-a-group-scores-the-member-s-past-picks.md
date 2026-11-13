# Joining a group scores the member's past picks

2026-11-14

- **On join, frontend-api asks score-manager** to score the new member's picks of every final game in that group, so their score there counts from the start, not from the day they joined.
- **A failed score undoes the join** (503, join again): a member with missing scores would sit wrong on the scoreboard with nothing to fix it; revisit with a retry if score-manager blips show up.
- **The owner can't leave** (409): a group without its owner has no one to edit or delete it; revisit when ownership can be handed over.
- **A leaver's scores stay**: unseen (the scoreboard lists members), and overwritten when they join again, so leaving writes only `group_members`.
- **Non-members of a public group see its scoreboard, not its games or picks** (403 on the picks), as asked.
