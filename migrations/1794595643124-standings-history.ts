import { MigrationInterface, QueryRunner } from 'typeorm';

export class StandingsHistory1794595643124 implements MigrationInterface {
  name = 'StandingsHistory1794595643124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "standings_history" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "conference" character varying NOT NULL, "division" character varying NOT NULL, "games_played" integer NOT NULL, "wins" integer NOT NULL, "losses" integer NOT NULL, "win_pct" double precision NOT NULL, "games_behind" double precision NOT NULL, "points_for" integer NOT NULL, "points_against" integer NOT NULL, "point_differential" integer NOT NULL, "streak" character varying NOT NULL, "home_record" character varying NOT NULL, "away_record" character varying NOT NULL, "division_record" character varying NOT NULL, "conference_record" character varying NOT NULL, "last10" character varying NOT NULL, "league_rank" integer NOT NULL, "conference_rank" integer NOT NULL, "division_rank" integer NOT NULL, "final" boolean NOT NULL, "date" date NOT NULL, "season" integer NOT NULL, "team_id" character varying NOT NULL, CONSTRAINT "PK_2ca80971550adbd1ea9139060ac" PRIMARY KEY ("date", "season", "team_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2ca80971550adbd1ea9139060a" ON "standings_history"  ("season", "team_id", "date") `,
    );
    await queryRunner.query(
      `ALTER TABLE "standings_history" ADD CONSTRAINT "FK_a105eb70f6f79122bf83e01fb0e" FOREIGN KEY ("season", "team_id") REFERENCES "standings"("season","team_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "standings_history" DROP CONSTRAINT "FK_a105eb70f6f79122bf83e01fb0e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ca80971550adbd1ea9139060a"`,
    );
    await queryRunner.query(`DROP TABLE "standings_history"`);
  }
}
