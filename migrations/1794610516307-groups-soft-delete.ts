import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroupsSoftDelete1794610516307 implements MigrationInterface {
  name = 'GroupsSoftDelete1794610516307';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "groups" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."groups_status_enum" ADD VALUE 'Deleted'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The old type has no Deleted: a deleted group goes for good, as it was never to be seen again.
    await queryRunner.query(
      `DELETE FROM "groups" WHERE "status"::text = 'Deleted'`,
    );
    await queryRunner.query(
      `ALTER TABLE "groups" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."groups_status_enum_old" AS ENUM('Active', 'Closed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "groups" ALTER COLUMN "status" TYPE "public"."groups_status_enum_old" USING "status"::"text"::"public"."groups_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."groups_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."groups_status_enum_old" RENAME TO "groups_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "groups" ALTER COLUMN "status" SET DEFAULT 'Active'`,
    );
    await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "deleted_at"`);
  }
}
