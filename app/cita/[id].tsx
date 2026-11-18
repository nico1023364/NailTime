import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, EmptyState, IconName, InfoLine, Screen, SectionTitle, StatusBadge } from '../../components/ui';
import { colors, radius } from '../../constants/theme';
import { errorMessage } from '../../lib/errors';
import { compareAppointments, firstName, formatDuration, isUpcoming, longDate, money, time12, toDateTime, toMin, toTime } from '../../lib/format';
import { addToCalendar, call, openRoute, openSearch, whatsapp } from '../../lib/native';
import { useStore } from '../../lib/store';
import type { AppointmentStatus } from '../../lib/types';
import { Alert } from '../../lib/alert';

export default function CitaDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useStore(s => s.session);
  const appointments = useStore(s => s.appointments);
  const business = useStore(s => s.business);
  const services = useStore(s => s.services);
  const updateAppointment = useStore(s => s.updateAppointment);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const appt = appointments.find(a => a.id === id);
  const history = useMemo(
    () => (appt ? appointments.filter(a => a.clientId === appt.clientId && a.id !== appt.id).sort((a, b) => compareAppointments(b, a)) : []),
    [appointments, appt]
  );

  if (!appt) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Cita no encontrada" text="Es posible que ya no exista." />
      </Screen>
    );
  }

  const isPro = session?.role === 'manicurista';
  const service = services.find(s => s.id === appt.serviceId);
  const end = toTime(toMin(appt.time) + appt.duration);
  const upcoming = isUpcoming(appt);
  const place = appt.modality === 'domicilio' ? appt.address ?? '' : `${business.address}, ${business.city}`;
  const contactName = isPro ? appt.clientName : business.name;
  const contactPhone = isPro ? appt.clientPhone : business.whatsapp;
  const when = `${longDate(appt.date).toLowerCase()} a las ${time12(appt.time)}`;
  const message = isPro
    ? `Hola ${firstName(appt.clientName)}, te escribo de ${business.name} sobre tu cita de ${appt.serviceName} el ${when}.`
    : `Hola ${firstName(business.owner)}, te escribo por mi cita de ${appt.serviceName} el ${when}.`;

  const openPlace = () => {
    if (appt.modality === 'domicilio') {
      if (appt.latitude != null && appt.longitude != null) openRoute(appt.latitude, appt.longitude);
      else openSearch(place);
    } else {
      openRoute(business.latitude, business.longitude);
    }
  };

  const changeStatus = async (status: AppointmentStatus) => {
    setBusy(true);
    try {
      await updateAppointment(appt.id, { status });
    } catch (e) {
      Alert.alert('No pudimos actualizar la cita', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () =>
    Alert.alert(
      'Cancelar cita',
      isPro ? '¿Seguro que quieres cancelar esta cita? El horario quedará libre.' : '¿Seguro que quieres cancelar tu cita? El horario quedará libre para otra clienta.',
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => void changeStatus('cancelada') },
      ]
    );

  const reschedule = () => {
    if (!appt.serviceId) {
      Alert.alert('No disponible', 'Este servicio ya no existe, por lo que no se puede reprogramar.');
      return;
    }
    router.push({ pathname: '/reservar/[id]', params: { id: appt.serviceId, cita: appt.id } });
  };

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
    <Screen>
      <Card>
        <View style={styles.heroTop}>
          {service?.photo ? (
            <Image source={{ uri: service.photo }} style={styles.heroIcon} />
          ) : (
            <View style={styles.heroIcon}>
              <Ionicons name={(service?.icon ?? 'sparkles-outline') as IconName} size={28} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.service}>{appt.serviceName}</Text>
            <Text style={styles.price}>{money(appt.price)}</Text>
          </View>
          <StatusBadge status={appt.status} />
        </View>
        <View style={styles.divider} />
        <InfoLine icon="calendar-outline" text={longDate(appt.date)} />
        <InfoLine icon="time-outline" text={`${time12(appt.time)} – ${time12(end)} · ${formatDuration(appt.duration)}`} />
        <InfoLine icon={appt.modality === 'domicilio' ? 'car-outline' : 'storefront-outline'} text={appt.modality === 'domicilio' ? 'Servicio a domicilio' : 'En el estudio'} />
      </Card>

      <SectionTitle title={isPro ? 'Clienta' : 'Manicurista'} />
      <Card>
        <View style={styles.contact}>
          <Avatar name={contactName} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName}>{contactName}</Text>
            <Text style={styles.contactSub}>{contactPhone}</Text>
          </View>
        </View>
        <View style={styles.row2}>
          <Button small variant="secondary" icon="call-outline" title="Llamar" style={styles.flex} onPress={() => call(contactPhone)} />
          <Button small variant="success" icon="logo-whatsapp" title="WhatsApp" style={styles.flex} onPress={() => whatsapp(contactPhone, message)} />
        </View>
      </Card>

      <SectionTitle title="Lugar" />
      <Card onPress={openPlace}>
        <View style={styles.contact}>
          <View style={styles.placeIcon}>
            <Ionicons name="location" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName}>{appt.modality === 'domicilio' ? 'Dirección de la clienta' : business.name}</Text>
            <Text style={styles.contactSub}>{place}</Text>
          </View>
          <Ionicons name="navigate-outline" size={22} color={colors.primary} />
        </View>
      </Card>

      {appt.referencePhoto ? (
        <>
          <SectionTitle title="Diseño de referencia" />
          <Image source={{ uri: appt.referencePhoto }} style={styles.photo} />
        </>
      ) : null}

      {appt.notes ? (
        <>
          <SectionTitle title="Notas" />
          <Card>
            <Text style={styles.notes}>{appt.notes}</Text>
          </Card>
        </>
      ) : null}

      <View style={styles.actions}>
        {isPro && appt.status === 'pendiente' && upcoming ? (
          <Button title="Confirmar cita" icon="checkmark-circle-outline" loading={busy} onPress={() => void changeStatus('confirmada')} />
        ) : null}
        {isPro && appt.status === 'confirmada' ? (
          <Button title="Marcar como completada" icon="sparkles-outline" variant="success" loading={busy} onPress={() => void changeStatus('completada')} />
        ) : null}
        {!isPro && upcoming ? (
          <Button title={added ? 'Agregada a tu calendario' : 'Agregar a mi calendario'} icon="calendar-outline" variant="secondary" disabled={added} onPress={addCal} />
        ) : null}
        {upcoming ? <Button title="Reprogramar" icon="swap-horizontal-outline" variant="outline" onPress={reschedule} /> : null}
        {upcoming ? <Button title={isPro ? 'Cancelar cita' : 'Cancelar mi cita'} icon="close-circle-outline" variant="danger" loading={busy} onPress={cancel} /> : null}
      </View>

      {isPro && history.length > 0 ? (
        <>
          <SectionTitle title={`Historial de ${firstName(appt.clientName)}`} />
          <Card style={styles.historyCard}>
            {history.map((h, i) => (
              <Pressable key={h.id} onPress={() => router.push(`/cita/${h.id}`)} style={[styles.historyRow, i > 0 && styles.historyDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyService}>{h.serviceName}</Text>
                  <Text style={styles.historyDate}>
                    {longDate(h.date)} · {time12(h.time)}
                  </Text>
                </View>
                <StatusBadge status={h.status} />
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  service: { fontSize: 18, fontWeight: '900', color: colors.text },
  price: { fontSize: 15, fontWeight: '800', color: colors.primaryDark, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 16, marginBottom: 4 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactName: { fontSize: 15, fontWeight: '800', color: colors.text },
  contactSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  placeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  row2: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
  photo: { width: '100%', height: 240, borderRadius: radius.lg },
  notes: { fontSize: 14, color: colors.text, lineHeight: 21 },
  actions: { gap: 12, marginTop: 26 },
  historyCard: { paddingVertical: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  historyDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  historyService: { fontSize: 14, fontWeight: '700', color: colors.text },
  historyDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
