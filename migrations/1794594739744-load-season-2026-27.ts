import { MigrationInterface, QueryRunner } from 'typeorm';

// The 2026-27 season: its regular season's first and last days.
export class LoadSeason2026271794594739744 implements MigrationInterface {
  name = 'LoadSeason2026271794594739744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "seasons" ("id", "name", "start_date", "end_date") VALUES ($1, $2, $3, $4)`,
      ['nba-2026-27', 'NBA 2026-2027', '2026-10-20', '2027-04-11'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "seasons" WHERE "id" = $1`, [
      'nba-2026-27',
    ]);
  }
}
