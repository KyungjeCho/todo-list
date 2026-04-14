import 'src/i18n';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from '@expo-google-fonts/noto-sans';
import { AuthNavigator } from './src/app/navigation/AuthNavigator';
import { useAuthStore } from './src/store/authStore';
import { useSoundStore } from './src/store/soundStore';
import { soundService } from './src/features/sound/soundService';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const restoreTokens = useAuthStore((s) => s.restoreTokens);

  const [fontsLoaded] = useFonts({
    'NotoSans-Regular': NotoSans_400Regular,
    'NotoSans-Medium': NotoSans_500Medium,
    'NotoSans-SemiBold': NotoSans_600SemiBold,
    'NotoSans-Bold': NotoSans_700Bold,
  });

  useEffect(() => {
    Promise.allSettled([
      restoreTokens(),
      useSoundStore.getState().hydrate(),
      soundService.preload(),
    ]).finally(() => setIsReady(true));
  }, [restoreTokens]);

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
