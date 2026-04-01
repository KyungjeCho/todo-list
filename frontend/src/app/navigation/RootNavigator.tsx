import React from 'react';
import { AuthNavigator } from './AuthNavigator';

// WHY: RootNavigator는 앱 진입점. 인증 상태에 따라 AuthNavigator가 화면을 분기한다.
export const RootNavigator: React.FC = () => {
  return <AuthNavigator />;
};
