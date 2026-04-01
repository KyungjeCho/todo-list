import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixOauthCompositeUnique1711411200002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ux_userAuthOauth_providerUserId"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_userAuthOauth_provider_providerUserId" ON "todolist_user_auth_oauth" ("provider", "provider_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ux_userAuthOauth_provider_providerUserId"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_userAuthOauth_providerUserId" ON "todolist_user_auth_oauth" ("provider_user_id")`,
    );
  }
}
