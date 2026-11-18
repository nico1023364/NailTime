import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FadeIn, PopIn } from '../../components/animation';
import { FloatingIcon, PulseBadge, StaggerItem } from '../../components/animations';
import { Button, Card, Row, Screen } from '../../components/ui';
import { colors, shadow } from '../../constants/theme';
import { firstName, longDate, money, time12, toDateTime } from '../../lib/format';
import { addToCalendar, whatsapp } from '../../lib/native';
import { useStore } from '../../lib/store';
import { Alert } from '../../lib/alert';

export default function Confirmacion() {
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo?: string }>();
  const session = useStore(s => s.session);
  const business = useStore(s => s.business);
  const appt = useStore(s => s.appointments.find(a => a.id === id));
  const [added, setAdded] = useState(false);
  const isPro = session?.role === 'manicurista';
  const rescheduled = tipo === 'reprogramada';

  const goBack = () => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate(isPro ? '/agenda' : '/citas');
  };

  if (!appt) {
    return (
      <SafeAreaView style={styles.safe}>
        <Screen>
          <Button title="Volver" onPress={goBack} />
        </Screen>
      </SafeAreaView>
    );
  }

  const place = appt.modality === 'domicilio' ? appt.address ?? '' : `${business.address}, ${business.city}`;

  const addCal = async () => {
    const res = await addToCalendar({
      title: `${appt.serviceName} · ${business.name}`,
      start: toDateTime(appt.date, appt.time),
      minutes: appt.duration,
      location: place,
      notes: appt.notes,
    });
    if (res === 'ok') {
      setAdded(true);
      Alert.alert('Listo', 'La cita quedó guardada en el calendario de tu celular.');
    } else if (res === 'unavailable') {
      Alert.alert('Calendario', 'Guardar en el calendario no está disponible en esta vista previa. Funciona en la app instalada.');
    } else {
      Alert.alert('Calendario', 'No fue posible acceder al calendario. Revisa los permisos de la app.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Screen contentStyle={styles.content}>
        <View style={styles.iconWrap}>
          <PulseBadge>
            <PopIn delay={80}>
              <View style={styles.iconRing}>
                <Ionicons name="checkmark" size={48} color={colors.white} />
              </View>
            </PopIn>
          </PulseBadge>
          <FloatingIcon name="sparkles" size={22} color={colors.gold} amplitude={8} style={styles.confettiOne} />
          <FloatingIcon name="star" size={16} color={colors.primaryLight} amplitude={6} duration={1900} style={styles.confettiTwo} />
        </View>
        <FadeIn delay={140}>
          <Text style={styles.title}>{rescheduled ? '¡Cita reprogramada!' : '¡Reserva enviada!'}</Text>
          <Text style={styles.text}>
            {isPro
              ? 'El nuevo horario quedó guardado y la clienta lo verá en su app.'
              : `${firstName(business.owner)} confirmará tu cita pronto. Te enviaremos recordatorios 24 horas y 2 horas antes.`}
          </Text>
        </FadeIn>

        <StaggerItem index={0}>
          <Card style={styles.card}>
            <Row label="Servicio" value={appt.serviceName} />
            <Row label="Fecha" value={longDate(appt.date)} />
            <Row label="Hora" value={time12(appt.time)} />
            <Row label="Lugar" value={appt.modality === 'domicilio' ? 'A domicilio' : business.name} />
            <View style={styles.divider} />
            <Row label="Total" value={money(appt.price)} strong />
          </Card>
        </StaggerItem>

        <View style={styles.actions}>
          {!isPro ? (
            <>
              <StaggerItem index={1}><Button title={added ? 'Agregada a tu calendario' : 'Agregar a mi calendario'} icon="calendar-outline" variant="secondary" disabled={added} onPress={addCal} /></StaggerItem>
              <StaggerItem index={2}>
              <Button
                title="Escribir por WhatsApp"
                icon="logo-whatsapp"
                variant="outline"
                onPress={() => whatsapp(business.whatsapp, `Hola ${firstName(business.owner)}, acabo de reservar ${appt.serviceName} para el ${longDate(appt.date).toLowerCase()} a las ${time12(appt.time)}.`)}
              />
              </StaggerItem>
            </>
          ) : null}
          <StaggerItem index={3}><Button title={isPro ? 'Volver a la agenda' : 'Ver mis citas'} icon="arrow-forward" onPress={goBack} /></StaggerItem>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 40 },
  iconWrap: { alignItems: 'center' },
  confettiOne: { position: 'absolute', left: -30, top: 6 },
  confettiTwo: { position: 'absolute', right: -24, bottom: 10 },
  iconRing: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 10, borderColor: colors.soft, ...shadow },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: 22 },
  text: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 10 },
  card: { marginTop: 26 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  actions: { gap: 12, marginTop: 24 },
});
