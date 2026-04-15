import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type {
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SoundPressable } from '../common/SoundPressable';
import { spacing } from '../../theme';
import type { OAuthProvider } from '../../types/user';

interface OAuthProviderButtonProps {
  provider: OAuthProvider;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * 브랜드 아이콘 에셋. 미지정 또는 로딩 실패 시 텍스트-only 버튼으로 폴백한다(FR-010).
   */
  iconSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const OAuthProviderButton: React.FC<OAuthProviderButtonProps> = ({
  provider,
  label,
  onPress,
  disabled,
  iconSource,
  style,
  textStyle,
}) => {
  // WHY(FR-010): 브랜드 에셋이 아직 추가되지 않았거나 네트워크 에셋 로드 실패 시에도
  // 로그인 플로우는 유지되어야 하므로 아이콘만 숨기고 텍스트 라벨은 그대로 노출한다.
  const [iconFailed, setIconFailed] = useState(false);
  const showIcon = iconSource !== undefined && !iconFailed;

  return (
    <SoundPressable
      testID={`login-button-${provider}`}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={[styles.button, style]}
      onPress={onPress}
    >
      <View style={styles.content}>
        {showIcon && (
          <Image
            testID={`oauth-icon-${provider}`}
            source={iconSource}
            style={styles.icon}
            resizeMode="contain"
            onError={() => setIconFailed(true)}
          />
        )}
        <Text style={[styles.label, textStyle]}>{label}</Text>
      </View>
    </SoundPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 20,
    height: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
