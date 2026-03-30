import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueFromTodoId1711411200001 implements MigrationInterface {
  name = 'AddUniqueFromTodoId1711411200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_carriedOverHistory_fromTodoId"
        ON "todolist_carried_over_history" ("from_todo_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_carriedOverHistory_fromTodoId"
    `);
  }
}
