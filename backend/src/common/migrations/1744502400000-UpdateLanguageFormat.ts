import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5 스키마 정리:
 *  - language: BCP-47(ko-KR 등) → 언어 subtag(ko/en/ja/es)로 통일, 기본값 'en'.
 *  - timezone: nullable 전환 및 DEFAULT 'UTC' 제거.
 *    WHY: 신규 가입 시 디바이스 감지 실패 시 null로 저장하는 로직과 DB NOT NULL/DEFAULT 스키마가 불일치하여
 *    가입 실패 또는 의도치 않은 'UTC' 저장이 발생. 스케줄러는 COALESCE(timezone,'UTC')로 fallback.
 */
export class UpdateLanguageFormat1744502400000 implements MigrationInterface {
  name = 'UpdateLanguageFormat1744502400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'ko' WHERE "language" = 'ko-KR'`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'en' WHERE "language" = 'en-US'`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'ja' WHERE "language" = 'ja-JP'`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'es' WHERE "language" = 'es-ES'`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'en' WHERE "language" NOT IN ('ko', 'en', 'ja', 'es')`,
    );
    await queryRunner.query(
      `ALTER TABLE "todolist_user" ALTER COLUMN "language" SET DEFAULT 'en'`,
    );

    await queryRunner.query(
      `ALTER TABLE "todolist_user" ALTER COLUMN "timezone" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "todolist_user" ALTER COLUMN "timezone" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "todolist_user" SET "timezone" = 'UTC' WHERE "timezone" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "todolist_user" ALTER COLUMN "timezone" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "todolist_user" ALTER COLUMN "timezone" SET DEFAULT 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "todolist_user" ALTER COLUMN "language" DROP DEFAULT`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'ko-KR' WHERE "language" = 'ko'`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'en-US' WHERE "language" = 'en'`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'ja-JP' WHERE "language" = 'ja'`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "language" = 'es-ES' WHERE "language" = 'es'`,
    );
  }
}
