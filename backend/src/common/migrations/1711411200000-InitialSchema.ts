import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711411200000 implements MigrationInterface {
  name = 'InitialSchema1711411200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum types
    await queryRunner.query(`
      CREATE TYPE "todolist_todo_status" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'CARRIED_OVER')
    `);
    await queryRunner.query(`
      CREATE TYPE "todolist_notification_log_notification_type" AS ENUM ('PLAN', 'REVIEW')
    `);
    await queryRunner.query(`
      CREATE TYPE "todolist_notification_log_status" AS ENUM ('SUCCESS', 'FAIL')
    `);

    // TODOLIST_USER_AUTH
    await queryRunner.query(`
      CREATE TABLE "todolist_user_auth" (
        "id" UUID CONSTRAINT "pkx_userAuth_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "login_id" VARCHAR(100) NULL,
        "password_hash" VARCHAR(255) NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_userAuth_loginId" ON "todolist_user_auth" ("login_id")
    `);

    // TODOLIST_USER
    await queryRunner.query(`
      CREATE TABLE "todolist_user" (
        "id" UUID CONSTRAINT "pkx_user_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_auth_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "user_name" VARCHAR(100) NOT NULL,
        "plan_time" TIME NULL,
        "review_time" TIME NULL,
        "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
        "language" VARCHAR(10) NOT NULL,
        CONSTRAINT "fk_user_userAuth" FOREIGN KEY ("user_auth_id")
          REFERENCES "todolist_user_auth" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_user_userAuthId" ON "todolist_user" ("user_auth_id")
    `);

    // TODOLIST_USER_AUTH_OAUTH
    await queryRunner.query(`
      CREATE TABLE "todolist_user_auth_oauth" (
        "id" UUID CONSTRAINT "pkx_userAuthOauth_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_auth_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "provider" VARCHAR(100) NOT NULL,
        "provider_user_id" VARCHAR(255) NOT NULL,
        "provider_user_email" VARCHAR(255) NOT NULL,
        CONSTRAINT "fk_userAuthOauth_userAuth" FOREIGN KEY ("user_auth_id")
          REFERENCES "todolist_user_auth" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_userAuthOauth_userAuthId" ON "todolist_user_auth_oauth" ("user_auth_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_userAuthOauth_providerUserId" ON "todolist_user_auth_oauth" ("provider_user_id")
    `);

    // TODOLIST_USER_SESSION
    await queryRunner.query(`
      CREATE TABLE "todolist_user_session" (
        "id" UUID CONSTRAINT "pkx_userSession_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_auth_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "refresh_token" TEXT NOT NULL,
        "user_agent" TEXT NULL,
        "ip_address" VARCHAR(45) NULL,
        "expired_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "fk_userSession_userAuth" FOREIGN KEY ("user_auth_id")
          REFERENCES "todolist_user_auth" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_userSession_userAuthId" ON "todolist_user_session" ("user_auth_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_userSession_refreshToken" ON "todolist_user_session" ("refresh_token")
    `);

    // TODOLIST_TODO
    await queryRunner.query(`
      CREATE TABLE "todolist_todo" (
        "id" UUID CONSTRAINT "pkx_todo_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "status" "todolist_todo_status" NOT NULL DEFAULT 'ACTIVE',
        "todo_date" DATE NOT NULL,
        "content" VARCHAR(255) NOT NULL,
        CONSTRAINT "fk_todo_user" FOREIGN KEY ("user_id")
          REFERENCES "todolist_user" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_todo_userId" ON "todolist_todo" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_todo_userId_todoDate" ON "todolist_todo" ("user_id", "todo_date")
    `);

    // TODOLIST_CARRIED_OVER_HISTORY
    await queryRunner.query(`
      CREATE TABLE "todolist_carried_over_history" (
        "id" UUID CONSTRAINT "pkx_carriedOverHistory_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "from_todo_id" UUID NOT NULL,
        "to_todo_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_carriedOverHistory_fromTodo" FOREIGN KEY ("from_todo_id")
          REFERENCES "todolist_todo" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_carriedOverHistory_toTodo" FOREIGN KEY ("to_todo_id")
          REFERENCES "todolist_todo" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_carriedOverHistory_fromTodoId" ON "todolist_carried_over_history" ("from_todo_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_carriedOverHistory_toTodoId" ON "todolist_carried_over_history" ("to_todo_id")
    `);

    // TODOLIST_TODO_MEMO
    await queryRunner.query(`
      CREATE TABLE "todolist_todo_memo" (
        "id" UUID CONSTRAINT "pkx_todoMemo_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "todo_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "content" TEXT NOT NULL,
        CONSTRAINT "fk_todoMemo_todo" FOREIGN KEY ("todo_id")
          REFERENCES "todolist_todo" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_todoMemo_todoId" ON "todolist_todo_memo" ("todo_id")
    `);

    // TODOLIST_NOTIFICATION_LOG
    await queryRunner.query(`
      CREATE TABLE "todolist_notification_log" (
        "id" UUID CONSTRAINT "pkx_notificationLog_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "status" "todolist_notification_log_status" NOT NULL,
        "notification_type" "todolist_notification_log_notification_type" NOT NULL,
        "error_message" TEXT NULL,
        "retry_count" INT NOT NULL DEFAULT 0,
        CONSTRAINT "fk_notificationLog_user" FOREIGN KEY ("user_id")
          REFERENCES "todolist_user" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notificationLog_userId" ON "todolist_notification_log" ("user_id")
    `);

    // TODOLIST_USER_DEVICE
    await queryRunner.query(`
      CREATE TABLE "todolist_user_device" (
        "id" UUID CONSTRAINT "pkx_userDevice_id" PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" UUID NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by" UUID NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "fcm_token" TEXT NOT NULL,
        "device_type" VARCHAR(20) NOT NULL,
        "device_name" VARCHAR(100) NULL,
        CONSTRAINT "fk_userDevice_user" FOREIGN KEY ("user_id")
          REFERENCES "todolist_user" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_userDevice_userId" ON "todolist_user_device" ("user_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_userDevice_fcmToken" ON "todolist_user_device" ("fcm_token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "todolist_user_device" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "todolist_notification_log" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "todolist_todo_memo" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "todolist_carried_over_history" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "todolist_todo" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "todolist_user_session" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "todolist_user_auth_oauth" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "todolist_user" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "todolist_user_auth" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "todolist_notification_log_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "todolist_notification_log_notification_type"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "todolist_todo_status"`);
  }
}
