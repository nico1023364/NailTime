import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BusinessForm } from '../components/BusinessForm';
import { Button, Card, Screen } from '../components/ui';
import { colors, gradients, radius, shadow } from '../constants/theme';
import { firstName } from '../lib/format';
import { useStore } from '../lib/store';
import type { BusinessInput } from '../lib/types';
import { Alert } from '../lib/alert';

export default function Onboarding() {
  const session = useStore(s => s.session);
  const business = useStore(s => s.business);
  const saveBusiness = useStore(s => s.saveBusiness);
  const signOut = useStore(s => s.signOut);

  const submit = async (values: BusinessInput) => {
    await saveBusiness(values);
    router.replace('/agenda');
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
      <View style={styles.hero}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
          <Ionicons name="sparkles" size={30} color={colors.white} />
        </LinearGradient>
        <Text style={styles.title}>Bienvenida, {firstName(session?.name ?? '')}</Text>
        <Text style={styles.subtitle}>Configura tu estudio para empezar a recibir reservas.</Text>
      </View>

      <Card style={styles.notice}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.noticeText}>
          Esta es la cuenta principal del estudio. Solo tú puedes editar servicios, horarios, fotos y la información del
          negocio.
        </Text>
      </Card>

      <BusinessForm initial={{ ...business, owner: business.owner || session?.name || '' }} submitLabel="Crear mi estudio" onSubmit={submit} />

      <Button title="Cerrar sesión" icon="log-out-outline" variant="ghost" onPress={exit} style={{ marginTop: 14 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 18, marginBottom: 22 },
  logo: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], ...shadow },
  title: { fontSize: 27, fontWeight: '900', color: colors.primaryDark, marginTop: 18, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 21 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.softer, borderRadius: radius.lg },
  noticeText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
});
