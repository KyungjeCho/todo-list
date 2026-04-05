import React, { useState } from 'react';
import {
  TouchableOpacity,
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Todo } from '../../types/todo';
import { useShareTodo } from '../../features/share/useShareTodo';
import { colors, typography, spacing, radius } from '../../theme';

const TOAST_VERTICAL_RATIO = 0.65;

interface ShareButtonProps {
  todos: Todo[];
  date: string;
}

export function ShareButton({
  todos,
  date,
}: ShareButtonProps): React.JSX.Element {
  const { shareTodos, copyToClipboard, isSharing, copied, error } =
    useShareTodo();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
  const disabled = todos.length === 0;

  if (isSharing) {
    return (
      <View testID="share-button" style={styles.button}>
        <ActivityIndicator testID="share-loading" size="small" />
      </View>
    );
  }

  const handlePress = () => {
    if (disabled) {
      Alert.alert('알림', '공유할 할 일이 없습니다');
      return;
    }
    setMenuVisible(true);
  };

  const handleDismiss = () => {
    setMenuVisible(false);
  };

  const handleCopyToClipboard = () => {
    setMenuVisible(false);
    void copyToClipboard(todos, date);
  };

  const handleShareToOthers = () => {
    setMenuVisible(false);
    void shareTodos(todos, date);
  };

  return (
    <View>
      <TouchableOpacity
        testID="share-button"
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={handlePress}
        accessibilityLabel="공유"
      >
        <Text
          style={[styles.buttonText, disabled && styles.buttonTextDisabled]}
        >
          공유
        </Text>
      </TouchableOpacity>

      <Modal
        visible={copied}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View
          testID="share-toast-container"
          style={[
            styles.toastOverlay,
            { paddingTop: windowHeight * TOAST_VERTICAL_RATIO },
          ]}
          pointerEvents="none"
        >
          <View testID="share-toast" style={styles.toast}>
            <Text style={styles.toastText}>클립보드에 복사되었습니다</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={error !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View
          testID="share-error-container"
          style={[
            styles.toastOverlay,
            { paddingTop: windowHeight * TOAST_VERTICAL_RATIO },
          ]}
          pointerEvents="none"
        >
          <View testID="share-error" style={styles.errorToast}>
            <Text style={styles.toastText}>{error}</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <Pressable
          testID="share-backdrop"
          style={[styles.backdrop, { paddingTop: insets.top + spacing.lg }]}
          onPress={handleDismiss}
        >
          <View testID="share-menu" style={styles.menu}>
            <TouchableOpacity
              testID="share-to-others"
              style={styles.menuItem}
              onPress={handleShareToOthers}
            >
              <Text style={styles.menuText}>공유하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="copy-to-clipboard"
              style={styles.menuItem}
              onPress={handleCopyToClipboard}
            >
              <Text style={styles.menuText}>클립보드 복사</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    borderColor: colors.borderLight,
  },
  buttonText: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.primary,
  },
  buttonTextDisabled: {
    color: colors.disabled,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    shadowColor: colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 150,
  },
  menuItem: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuText: {
    ...typography.body,
    color: colors.onSurface,
  },
  toastOverlay: {
    flex: 1,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: colors.onSurface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  toastText: {
    fontSize: 12,
    color: colors.surface,
  },
  errorToast: {
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
});
