import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Button, Card, Input, LoadingView, Screen } from '../components/ui';
import { colors } from '../constants/theme';
import { consumeAuthUrl, initialAuthUrl } from '../lib/authLinks';
import { errorMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Alert } from '../lib/alert';

type Status = 'checking' | 'ready' | 'invalid';

export default function NuevaContrasena() {
  const updatePassword = useStore(s => s.updatePassword);
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (alive && data.session) setStatus('ready');
    };

    void check();

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setStatus('ready');
    });

    const onUrl = async (url: string | null) => {
      try {
        const changed = await consumeAuthUrl(url);
        if (changed) await check();
      } catch (e) {
        if (alive) {
          setError(errorMessage(e));
          setStatus('invalid');
        }
      }
    };

    if (Platform.OS !== 'web') {
      void initialAuthUrl().then(onUrl);
    }

    const listener = Linking.addEventListener('url', ({ url }) => {
      void onUrl(url);
    });

    const timer = setTimeout(() => {
      if (alive) setStatus(current => (current === 'checking' ? 'invalid' : current));
    }, 5000);

    return () => {
      alive = false;
      authSub.subscription.unsubscribe();
      listener.remove();
      clearTimeout(timer);
    };
  }, []);

  const save = async () => {
    if (password.length < 6) {
      setError('Usa al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await updatePassword(password);
      Alert.alert('Listo', 'Tu contraseña fue actualizada. Ya puedes usar tu cuenta.');
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (status === 'checking') {
    return <LoadingView label="Validando el enlace…" />;
  }

  if (status === 'invalid') {
    return (
      <Screen>
        <Card style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="link-outline" size={34} color={colors.danger} />
          </View>
          <Text style={styles.title}>Enlace inválido o vencido</Text>
          <Text style={styles.text}>
            {error ?? 'Solicita un nuevo enlace de recuperación o inicia sesión si ya recordaste tu contraseña.'}
          </Text>
          <Button title="Solicitar otro enlace" icon="mail-outline" onPress={() => router.replace('/recuperar')} />
          <Button title="Volver a ingresar" variant="ghost" onPress={() => router.replace('/login')} style={{ marginTop: 8 }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Elige una nueva contraseña</Text>
        <Text style={styles.text}>Después de guardarla podrás entrar con tu correo y tu nueva contraseña.</Text>

        <Input
          label="Nueva contraseña"
          icon="lock-closed-outline"
          secureTextEntry
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChangeText={setPassword}
        />
        <Input
          label="Repetir contraseña"
          icon="lock-closed-outline"
          secureTextEntry
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          value={confirm}
          onChangeText={setConfirm}
          error={error ?? undefined}
        />

        <Button title="Guardar contraseña" icon="shield-checkmark-outline" loading={busy} onPress={save} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 24 },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '900', color: colors.text, textAlign: 'center' },
  text: { fontSize: 14, color: colors.muted, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 22 },
});
