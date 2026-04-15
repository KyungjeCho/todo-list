import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * feature/007: `todolist_user.has_completed_onboarding` 컬럼 추가.
 *
 * WHY: 온보딩 완료 여부를 1급 도메인 속성으로 승격(plan/reviewTime 기반 추론 제거).
 * 기존 사용자는 전원 완료 처리하여 재온보딩을 요구하지 않는다.
 */
export class AddHasCompletedOnboardingToUser1744848000000 implements MigrationInterface {
  name = 'AddHasCompletedOnboardingToUser1744848000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "todolist_user" ADD COLUMN "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT FALSE`,
    );
    await queryRunner.query(
      `UPDATE "todolist_user" SET "has_completed_onboarding" = TRUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "todolist_user" DROP COLUMN "has_completed_onboarding"`,
    );
  }
}
