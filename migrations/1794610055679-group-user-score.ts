import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroupUserScore1794610055679 implements MigrationInterface {
  name = 'GroupUserScore1794610055679';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "group_user_score" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "group_id" uuid NOT NULL, "user_id" uuid NOT NULL, "game_id" character varying NOT NULL, "score" integer NOT NULL, CONSTRAINT "UQ_7059190477759664b4652f7b11d" UNIQUE ("group_id", "user_id", "game_id"), CONSTRAINT "PK_6b91952c2229e2e698dac4cb1b3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_score" ADD CONSTRAINT "FK_bdf24e59d2d82fbbe9dff079c35" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_score" ADD CONSTRAINT "FK_7f2a3c30256fe7087d036668a4a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_score" ADD CONSTRAINT "FK_4fcfef70ab181e5e42cc53181f6" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "group_user_score" DROP CONSTRAINT "FK_4fcfef70ab181e5e42cc53181f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_score" DROP CONSTRAINT "FK_7f2a3c30256fe7087d036668a4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_score" DROP CONSTRAINT "FK_bdf24e59d2d82fbbe9dff079c35"`,
    );
    await queryRunner.query(`DROP TABLE "group_user_score"`);
  }
}
