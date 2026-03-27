import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../features/auth/useAuth';
import { useAuthStore } from '../../store/authStore';
import type { OAuthProvider } from '../../types/user';

interface LoginScreenProps {
  onLogin?: (provider: OAuthProvider) => void;
  isLoading?: boolean;
  error?: string;
}

const PROVIDERS: Array<{ key: OAuthProvider; label: string }> = [
  { key: 'google', label: 'Google로 로그인' },
  { key: 'naver', label: 'Naver로 로그인' },
  { key: 'kakao', label: 'Kakao로 로그인' },
  { key: 'apple', label: 'Apple로 로그인' },
];

export const LoginScreen: React.FC<LoginScreenProps> = (props) => {
  const auth = useAuth();
  const storeLoading = useAuthStore((s) => s.isLoading);

  const onLogin = props.onLogin ?? auth.login;
  const isLoading = props.isLoading ?? storeLoading;
  const error = props.error ?? auth.error ?? undefined;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo</Text>

      {isLoading && (
        <ActivityIndicator
          testID="login-loading-indicator"
          size="large"
        />
      )}

      {error && (
        <Text testID="login-error-message" style={styles.error}>
          {error}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        {PROVIDERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            testID={`login-button-${key}`}
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
            disabled={isLoading}
            style={styles.button}
            onPress={() => onLogin?.(key)}
          >
            <Text style={styles.buttonText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
});
