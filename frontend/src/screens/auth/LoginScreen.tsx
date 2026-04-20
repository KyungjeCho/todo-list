import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors, gradients, typography, spacing, radius } from '../../theme';
import { useAuth } from '../../features/auth/useAuth';
import { useAuthStore } from '../../store/authStore';
import type { OAuthProvider } from '../../types/user';
import { OAuthProviderButton } from '../../components/auth/OAuthProviderButton';
import { OAUTH_ICONS } from '../../components/auth/oauthIconCatalog';

interface LoginScreenProps {
  onLogin?: (provider: OAuthProvider) => void;
  isLoading?: boolean;
  error?: string;
}

interface ProviderConfig {
  key: OAuthProvider;
  label: string;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    key: 'google',
    label: 'auth.continueWithGoogle',
    backgroundColor: colors.surface,
    textColor: colors.onSurface,
    borderColor: colors.border,
  },
  {
    key: 'naver',
    label: 'auth.continueWithNaver',
    backgroundColor: '#03C75A',
    textColor: colors.surface,
  },
  {
    key: 'kakao',
    label: 'auth.continueWithKakao',
    backgroundColor: '#FEE500',
    textColor: colors.onSurface,
  },
  {
    key: 'apple',
    label: 'auth.continueWithApple',
    backgroundColor: colors.onSurface,
    textColor: colors.surface,
  },
];

function CheckSquareIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 11l3 3L22 4"
        stroke={colors.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
        stroke={colors.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const LoginScreen: React.FC<LoginScreenProps> = (props) => {
  const { t } = useTranslation();
  const auth = useAuth();
  const storeLoading = useAuthStore((s) => s.isLoading);

  const onLogin = props.onLogin ?? auth.login;
  const isLoading = props.isLoading ?? storeLoading;
  const error = props.error ?? auth.error ?? undefined;
  return (
    <LinearGradient
      colors={
        gradients.brandHero.colors as unknown as readonly [
          string,
          string,
          ...string[],
        ]
      }
      locations={
        gradients.brandHero.locations as unknown as readonly [
          number,
          number,
          ...number[],
        ]
      }
      start={gradients.brandHero.start}
      end={gradients.brandHero.end}
      style={styles.container}
    >
      <View style={styles.brandSection}>
        <CheckSquareIcon />
        <Text style={styles.title}>TodoList</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
      </View>

      {isLoading && (
        <ActivityIndicator testID="login-loading-indicator" size="large" />
      )}

      {error && (
        <Text testID="login-error-message" style={styles.error}>
          {/* WHY(T041): Apple 등에서 i18n 키 형태로 에러를 전달받으면
              t()로 번역하고, 이미 번역된 문자열/err.message는 동일 문자열이
              반환되어 그대로 표시된다. */}
          {error.startsWith('auth.') ? t(error) : error}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        {PROVIDERS.map(
          ({ key, label, backgroundColor, textColor, borderColor }) => {
            const button = (
              <OAuthProviderButton
                provider={key}
                label={t(label)}
                iconSource={OAUTH_ICONS[key]}
                disabled={isLoading}
                onPress={() => onLogin?.(key)}
                style={[
                  styles.button,
                  { backgroundColor },
                  borderColor ? { borderWidth: 1, borderColor } : undefined,
                ]}
                textStyle={[styles.buttonText, { color: textColor }]}
              />
            );
            // WHY(FR-001/T024): Apple 버튼은 Maestro E2E·단위 테스트에서
            // `oauth-button-apple` 식별자로 탭되어야 한다. 기존 `login-button-apple`은
            // 다른 컴포넌트·테스트와 호환을 위해 유지하고, 래퍼로 신규 testID를 덧붙인다.
            if (key === 'apple') {
              return (
                <View key={key} testID="oauth-button-apple">
                  {button}
                </View>
              );
            }
            return <View key={key}>{button}</View>;
          },
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  brandSection: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 60,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.body,
    color: colors.secondaryText,
  },
  buttonContainer: {
    width: 310,
    gap: spacing.md,
  },
  button: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.body,
    fontSize: 14,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
