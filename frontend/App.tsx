import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './src/app/navigation/AuthNavigator';
import { useAuthStore } from './src/store/authStore';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const restoreTokens = useAuthStore((s) => s.restoreTokens);

  useEffect(() => {
    restoreTokens().finally(() => setIsReady(true));
  }, [restoreTokens]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
