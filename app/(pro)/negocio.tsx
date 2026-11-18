import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BusinessForm } from '../../components/BusinessForm';
import { PasswordForm } from '../../components/PasswordForm';
import { Avatar, Button, Card, Screen, SectionTitle } from '../../components/ui';
import { colors } from '../../constants/theme';
import { useStore } from '../../lib/store';
import type { BusinessInput } from '../../lib/types';
import { Alert } from '../../lib/alert';

export default function Negocio() {
  const business = useStore(s => s.business);
  const session = useStore(s => s.session);
  const updateBusiness = useStore(s => s.updateBusiness);
  const signOut = useStore(s => s.signOut);

  const save = async (values: BusinessInput) => {
    await updateBusiness(values);
    Alert.alert('Guardado', 'La información de tu negocio fue actualizada.');
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
      <Card style={styles.account}>
        <Avatar name={session?.name ?? ''} size={54} />
        <View style={{ flex: 1 }}>
          <Text style={styles.accountName}>{session?.name}</Text>
          <Text style={styles.accountEmail}>{session?.email}</Text>
        </View>
      </Card>

      <BusinessForm
        initial={{ ...business, owner: business.owner || session?.name || '' }}
        submitLabel="Guardar cambios"
        onSubmit={save}
      />

      <SectionTitle title="Seguridad" />
      <Card>
        <PasswordForm />
      </Card>

      <Button title="Cerrar sesión" icon="log-out-outline" variant="danger" onPress={exit} style={{ marginTop: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  accountName: { fontSize: 17, fontWeight: '800', color: colors.text },
  accountEmail: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
