import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1794592848326 implements MigrationInterface {
  name = 'Init1794592848326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "teams" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" character varying NOT NULL, "abbreviation" character varying NOT NULL, "name" character varying NOT NULL, "nickname" character varying NOT NULL, "city" character varying NOT NULL, "conference" character varying NOT NULL, "division" character varying NOT NULL, "venue" jsonb NOT NULL, "active" boolean NOT NULL, CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."games_season_type_enum" AS ENUM('preseason', 'regular', 'cup_final', 'play_in', 'conference_tournament', 'postseason')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."games_status_enum" AS ENUM('scheduled', 'in_progress', 'final', 'postponed', 'canceled', 'suspended', 'delayed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "games" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" character varying NOT NULL, "season" integer NOT NULL, "season_type" "public"."games_season_type_enum" NOT NULL, "date" date NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."games_status_enum" NOT NULL, "status_detail" character varying, "period" integer, "clock" character varying, "home_team_id" character varying NOT NULL, "away_team_id" character varying NOT NULL, "home_score" integer, "away_score" integer, "period_scores" jsonb, "decided_in" character varying, "winner_team_id" character varying, "venue" jsonb, "neutral_site" boolean NOT NULL, "original_date" date, CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_673da60652b48c9ffca54ddc26" ON "games"  ("date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "players" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" character varying NOT NULL, "team_id" character varying, "name" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "position" character varying, "jersey_number" character varying, "height_in" integer, "weight_lb" integer, "birth_date" date, "birth_place" jsonb, "roster_status" character varying NOT NULL, "college" character varying, "experience_years" integer, CONSTRAINT "PK_de22b8fdeee0c33ab55ae71da3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce457a554d63e92f4627d6c576" ON "players"  ("team_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "standings" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "season" integer NOT NULL, "team_id" character varying NOT NULL, "conference" character varying NOT NULL, "division" character varying NOT NULL, "games_played" integer NOT NULL, "wins" integer NOT NULL, "losses" integer NOT NULL, "win_pct" double precision NOT NULL, "games_behind" double precision NOT NULL, "points_for" integer NOT NULL, "points_against" integer NOT NULL, "point_differential" integer NOT NULL, "streak" character varying NOT NULL, "home_record" character varying NOT NULL, "away_record" character varying NOT NULL, "division_record" character varying NOT NULL, "conference_record" character varying NOT NULL, "last10" character varying NOT NULL, "league_rank" integer NOT NULL, "conference_rank" integer NOT NULL, "division_rank" integer NOT NULL, "final" boolean NOT NULL, CONSTRAINT "PK_e19661469818cd2cf5313c40184" PRIMARY KEY ("season", "team_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD CONSTRAINT "FK_f6bc2302c5abcb1237f534d6efc" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD CONSTRAINT "FK_fbe84ca8c9405ed07bf7d471883" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD CONSTRAINT "FK_a17ef1eb8f0819d11d7a33662ff" FOREIGN KEY ("winner_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" ADD CONSTRAINT "FK_ce457a554d63e92f4627d6c5763" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "standings" ADD CONSTRAINT "FK_3bbd65ccfcbe4e9108b41528b65" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "standings" DROP CONSTRAINT "FK_3bbd65ccfcbe4e9108b41528b65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" DROP CONSTRAINT "FK_ce457a554d63e92f4627d6c5763"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" DROP CONSTRAINT "FK_a17ef1eb8f0819d11d7a33662ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" DROP CONSTRAINT "FK_fbe84ca8c9405ed07bf7d471883"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" DROP CONSTRAINT "FK_f6bc2302c5abcb1237f534d6efc"`,
    );
    await queryRunner.query(`DROP TABLE "standings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ce457a554d63e92f4627d6c576"`,
    );
    await queryRunner.query(`DROP TABLE "players"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_673da60652b48c9ffca54ddc26"`,
    );
    await queryRunner.query(`DROP TABLE "games"`);
    await queryRunner.query(`DROP TYPE "public"."games_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."games_season_type_enum"`);
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
