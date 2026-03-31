import React, { useState } from 'react';
import {
  TouchableOpacity,
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { Todo } from '../../types/todo';
import { useShareTodo } from '../../features/share/useShareTodo';

interface ShareButtonProps {
  todos: Todo[];
  date: string;
}

export function ShareButton({
  todos,
  date,
}: ShareButtonProps): React.JSX.Element {
  const { shareTodos, shareToSelf, isSharing, copied, error } = useShareTodo();
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
    if (!disabled) {
      setMenuVisible(true);
    }
  };

  const handleDismiss = () => {
    setMenuVisible(false);
  };

  const handleShareToSelf = () => {
    setMenuVisible(false);
    void shareToSelf(todos, date);
  };

  const handleShareToOthers = () => {
    setMenuVisible(false);
    void shareTodos(todos, date);
  };

  return (
    <View>
      <TouchableOpacity
        testID="share-button"
        style={styles.button}
        onPress={handlePress}
        disabled={disabled}
        accessibilityState={{ disabled }}
        accessibilityLabel="공유"
      >
        <Text style={styles.buttonText}>공유</Text>
      </TouchableOpacity>

      {copied && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>클립보드에 복사되었습니다</Text>
        </View>
      )}

      {error !== null && (
        <View testID="share-error" style={styles.errorToast}>
          <Text style={styles.toastText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <Pressable
          testID="share-backdrop"
          style={styles.backdrop}
          onPress={handleDismiss}
        >
          <View testID="share-menu" style={styles.menu}>
            <TouchableOpacity
              testID="share-to-self"
              style={styles.menuItem}
              onPress={handleShareToSelf}
            >
              <Text style={styles.menuText}>나에게 전송</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="share-to-others"
              style={styles.menuItem}
              onPress={handleShareToOthers}
            >
              <Text style={styles.menuText}>공유하기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 150,
  },
  menuItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  menuText: {
    fontSize: 14,
    color: '#333333',
  },
  toast: {
    position: 'absolute',
    bottom: -36,
    right: 0,
    backgroundColor: '#333333',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toastText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  errorToast: {
    position: 'absolute',
    bottom: -36,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
