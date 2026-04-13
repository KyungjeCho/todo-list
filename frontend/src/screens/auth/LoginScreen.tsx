import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '../../theme';
import { useAuth } from '../../features/auth/useAuth';
import { useAuthStore } from '../../store/authStore';
import type { OAuthProvider } from '../../types/user';

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
      colors={[colors.primaryLight, colors.surface]}
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
          {error}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        {PROVIDERS.map(
          ({ key, label, backgroundColor, textColor, borderColor }) => (
            <TouchableOpacity
              key={key}
              testID={`login-button-${key}`}
              accessibilityLabel={t(label)}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading }}
              disabled={isLoading}
              style={[
                styles.button,
                { backgroundColor },
                borderColor ? { borderWidth: 1, borderColor } : undefined,
              ]}
              onPress={() => onLogin?.(key)}
            >
              <Text style={[styles.buttonText, { color: textColor }]}>
                {t(label)}
              </Text>
            </TouchableOpacity>
          ),
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
