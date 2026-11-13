import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroupGameScore1794612938656 implements MigrationInterface {
  name = 'GroupGameScore1794612938656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "group_game_score" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "group_id" uuid NOT NULL, "game_id" character varying NOT NULL, "score" integer NOT NULL, CONSTRAINT "UQ_f2179fe361090b5dedbff6448d6" UNIQUE ("group_id", "game_id"), CONSTRAINT "PK_a26d192a17687ce1a122a9d13c0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_game_score" ADD CONSTRAINT "FK_f642ac8a2d85bdf4361f79924d3" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_game_score" ADD CONSTRAINT "FK_424f709bbd951a39bc1208a7091" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "group_game_score" DROP CONSTRAINT "FK_424f709bbd951a39bc1208a7091"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_game_score" DROP CONSTRAINT "FK_f642ac8a2d85bdf4361f79924d3"`,
    );
    await queryRunner.query(`DROP TABLE "group_game_score"`);
  }
}
