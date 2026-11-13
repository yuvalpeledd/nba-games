# Groups: public ones for everyone, private ones for their members

2026-11-14

- `GET /groups` answers every public group and the private ones the caller is in, since "the existing groups" with a public flag reads as public meaning listed for everyone.
- Members are a table of their own (`group_members`) from the start, so the groups list's member count is a count, and joining later is a row, not a migration.
- Revisit when joining, invitations or closing a group are built: who may see a private group's name (an invitee?) and whether a closed one stays listed.
