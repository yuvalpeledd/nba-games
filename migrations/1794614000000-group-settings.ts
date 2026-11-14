import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroupSettings1794614000000 implements MigrationInterface {
  name = 'GroupSettings1794614000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "groups" ADD "default_score" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "groups" ADD "max_members" integer NOT NULL DEFAULT '1000'`,
    );
    await queryRunner.query(`ALTER TABLE "groups" ADD "start_date" date`);
    await queryRunner.query(`ALTER TABLE "groups" ADD "end_date" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "end_date"`);
    await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "start_date"`);
    await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "max_members"`);
    await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "default_score"`);
  }
}
