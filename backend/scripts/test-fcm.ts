import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const fcmToken = process.argv[2];

if (!fcmToken) {
  console.error('Usage: npx ts-node scripts/test-fcm.ts <FCM_TOKEN>');
  process.exit(1);
}

if (!projectId || !privateKey || !clientEmail) {
  console.error('FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL 환경변수를 설정하세요.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
});

async function main() {
  try {
    const result = await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: '테스트 알림',
        body: 'FCM 푸시 알림이 정상 동작합니다!',
      },
      data: {
        type: 'PLAN',
      },
    });
    console.log('전송 성공:', result);
  } catch (error) {
    console.error('전송 실패:', error);
  }
}

main();
