import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';

/**
 * 인증 직후 프로필 로딩 중 Onboarding 으로 찰나 전환되는 플리커를 막기 위해
 * 단독 렌더되는 공통 스플래시. AuthNavigator 의 최상단에서 Stack 생성 이전에 사용.
 */
export const LoadingSplash: React.FC = () => {
  return (
    <SafeAreaView
      testID="loading-splash"
      style={styles.container}
      edges={['top', 'bottom']}
    >
      <View style={styles.inner}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
