import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Screen } from '../components/ui';
import { colors } from '../constants/theme';
import { errorMessage } from '../lib/errors';
import { useStore } from '../lib/store';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Recuperar() {
  const resetPassword = useStore(s => s.resetPassword);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Ingresa un correo válido.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <Card style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="mail-unread-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>Revisa tu correo</Text>
          <Text style={styles.text}>
            Si existe una cuenta con {email.trim()}, te enviamos un enlace para crear una nueva contraseña. Revisa también
            la carpeta de spam.
          </Text>
          <Button title="Volver a ingresar" icon="arrow-back" onPress={() => router.replace('/login')} />
          <Button title="Enviar de nuevo" variant="ghost" onPress={() => setSent(false)} style={{ marginTop: 8 }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Recupera tu acceso</Text>
        <Text style={styles.text}>
          Escribe el correo con el que creaste tu cuenta. Te enviaremos un enlace para elegir una nueva contraseña.
        </Text>

        {!isSupabaseConfigured ? (
          <View style={styles.warning}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <Text style={styles.warningText}>Supabase aún no está configurado en esta instalación.</Text>
          </View>
        ) : null}

        <Input
          label="Correo"
          icon="mail-outline"
          placeholder="tucorreo@ejemplo.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={error ?? undefined}
        />

        <Button title="Enviar enlace" icon="paper-plane-outline" loading={busy} disabled={!isSupabaseConfigured} onPress={send} />
        <Button title="Volver" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 24 },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '900', color: colors.text, textAlign: 'center' },
  text: { fontSize: 14, color: colors.muted, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningSoft, padding: 12, borderRadius: 12, marginBottom: 16 },
  warningText: { flex: 1, fontSize: 12.5, color: colors.warning, fontWeight: '600' },
});
