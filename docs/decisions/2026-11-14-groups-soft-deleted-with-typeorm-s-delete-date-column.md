# Groups: soft-deleted with TypeORM's delete date column

2026-11-14

- Deleting a group sets `status` `Deleted` and `deleted_at`, and keeps the row (its members too), as asked.
- `deleted_at` is a `@DeleteDateColumn`, so TypeORM leaves deleted groups out of every find and query builder on `groups` without a filter in each query: "never returned" holds for reads written later too.
- `DELETE /groups/:id` answers 204 with no body, so a deleted group is never in a response, not even the delete's.
- A down migration deletes the `Deleted` rows for good, since the old enum has no value for them.
- Revisit when a group must be restored or listed for an admin (`withDeleted: true`), or when raw SQL reads `groups`, which no column filters.
