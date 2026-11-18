import '../lib/calendarLocale';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../constants/theme';
import { DialogHost } from '../lib/alert';
import { configureNotifications } from '../lib/notifications';
import { useStore } from '../lib/store';

configureNotifications();

SplashScreen.preventAutoHideAsync().catch(() => {});

const AUTH_SCREENS = ['login', 'recuperar', 'nueva-contrasena'];

export default function RootLayout() {
  const ready = useStore(s => s.ready);
  const session = useStore(s => s.session);
  const configured = useStore(s => s.business.configured);
  const segments = useSegments();
  const router = useRouter();
  const root = segments[0];

  useEffect(() => useStore.getState().init(), []);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const inAuth = AUTH_SCREENS.includes(root ?? '');

    if (!session) {
      if (!inAuth) router.replace('/login');
      return;
    }

    if (root === 'login' || root === 'recuperar') {
      router.replace(session.role === 'manicurista' ? '/agenda' : '/inicio');
      return;
    }

    if (session.role === 'clienta' && root === '(pro)') {
      router.replace('/inicio');
      return;
    }

    if (session.role === 'manicurista') {
      if (root === '(clienta)') {
        router.replace('/agenda');
        return;
      }
      if (!configured && root !== 'onboarding' && root !== 'nueva-contrasena') {
        router.replace('/onboarding');
        return;
      }
      if (configured && root === 'onboarding') {
        router.replace('/agenda');
      }
    }
  }, [ready, session, configured, root, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { fontWeight: '800', color: colors.text },
          headerBackTitle: 'Atrás',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="recuperar" options={{ title: 'Recuperar contraseña' }} />
        <Stack.Screen name="nueva-contrasena" options={{ title: 'Nueva contraseña' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(clienta)" options={{ headerShown: false }} />
        <Stack.Screen name="(pro)" options={{ headerShown: false }} />
        <Stack.Screen name="reservar/[id]" options={{ title: 'Reservar cita' }} />
        <Stack.Screen name="cita/[id]" options={{ title: 'Detalle de la cita' }} />
        <Stack.Screen name="servicio" options={{ title: 'Servicio', presentation: 'modal' }} />
        <Stack.Screen name="confirmacion/[id]" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
      <DialogHost />
    </>
  );
}
