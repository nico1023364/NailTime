import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PasswordForm } from '../../components/PasswordForm';
import { Avatar, Button, Card, Input, Screen, SectionTitle } from '../../components/ui';
import { colors } from '../../constants/theme';
import { errorMessage } from '../../lib/errors';
import { isUpcoming } from '../../lib/format';
import { notificationsAvailable, notifyNow } from '../../lib/notifications';
import { useStore } from '../../lib/store';
import { Alert } from '../../lib/alert';

export default function Perfil() {
  const session = useStore(s => s.session);
  const appointments = useStore(s => s.appointments);
  const updateProfile = useStore(s => s.updateProfile);
  const signOut = useStore(s => s.signOut);
  const [name, setName] = useState(session?.name ?? '');
  const [phone, setPhone] = useState(session?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const mine = useMemo(() => appointments.filter(a => a.clientId === session?.id), [appointments, session?.id]);
  const done = mine.filter(a => a.status === 'completada').length;
  const upcoming = mine.filter(isUpcoming).length;

  const save = async () => {
    if (name.trim().length < 3) return Alert.alert('Nombre', 'Ingresa tu nombre completo.');
    if (!/^3\d{9}$/.test(phone.trim())) return Alert.alert('Celular', 'Ingresa un celular válido de 10 dígitos.');
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      Alert.alert('Listo', 'Tus datos fueron actualizados.');
    } catch (e) {
      Alert.alert('No pudimos guardar', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!notificationsAvailable()) {
      Alert.alert('Notificaciones', 'Los recordatorios se activan en la versión instalada de NailTime.');
      return;
    }
    const ok = await notifyNow('Recordatorio de NailTime', 'Así te avisaremos antes de cada cita.');
    if (!ok) Alert.alert('Notificaciones', 'Activa las notificaciones de la app en los ajustes de tu celular.');
  };

  const exit = () =>
    Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);

  return (
    <Screen>
      <View style={styles.top}>
        <Avatar name={session?.name ?? ''} size={86} />
        <Text style={styles.name}>{session?.name}</Text>
        <Text style={styles.email}>{session?.email}</Text>
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{upcoming}</Text>
          <Text style={styles.statLabel}>Próximas</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{done}</Text>
          <Text style={styles.statLabel}>Completadas</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{mine.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </Card>
      </View>

      <SectionTitle title="Mis datos" />
      <Card>
        <Input label="Nombre completo" icon="person-outline" value={name} onChangeText={setName} autoComplete="name" />
        <Input label="Celular" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
        <Button title="Guardar cambios" icon="checkmark" loading={saving} onPress={save} />
      </Card>

      <SectionTitle title="Recordatorios" />
      <Card>
        <Text style={styles.text}>Te enviamos una notificación 24 horas y 2 horas antes de cada cita para que no se te olvide.</Text>
        <Button title="Probar notificación" icon="notifications-outline" variant="secondary" onPress={test} style={{ marginTop: 14 }} />
      </Card>

      <SectionTitle title="Seguridad" />
      <Card>
        <PasswordForm />
      </Card>

      <Button title="Cerrar sesión" icon="log-out-outline" variant="danger" onPress={exit} style={{ marginTop: 28 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', marginTop: 4 },
  name: { fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 12 },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 20 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.primaryDark },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '600' },
  text: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
