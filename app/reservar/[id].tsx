import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { addDays, format } from 'date-fns';
import { ServiceCard } from '../../components/ServiceCard';
import { Button, Card, EmptyState, IconName, Input, Row, Screen, SectionTitle } from '../../components/ui';
import { calendarTheme, colors, radius } from '../../constants/theme';
import { errorMessage } from '../../lib/errors';
import { friendlyDate, longDate, money, time12, todayStr } from '../../lib/format';
import { askImage, currentLocation } from '../../lib/native';
import { getSlots, isDayOpen } from '../../lib/slots';
import { useStore } from '../../lib/store';
import { Modality } from '../../lib/types';
import { Alert } from '../../lib/alert';

function ModeOption({ icon, title, text, selected, onPress }: { icon: IconName; title: string; text: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.mode, selected && styles.modeActive]}>
      <View style={[styles.modeIcon, selected && styles.modeIconActive]}>
        <Ionicons name={icon} size={20} color={selected ? colors.white : colors.primary} />
      </View>
      <Text style={styles.modeTitle}>{title}</Text>
      <Text style={styles.modeText} numberOfLines={2}>
        {text}
      </Text>
    </Pressable>
  );
}

export default function Reservar() {
  const { id, cita } = useLocalSearchParams<{ id: string; cita?: string }>();
  const session = useStore(s => s.session);
  const services = useStore(s => s.services);
  const schedule = useStore(s => s.schedule);
  const appointments = useStore(s => s.appointments);
  const business = useStore(s => s.business);
  const addAppointment = useStore(s => s.addAppointment);
  const updateAppointment = useStore(s => s.updateAppointment);

  const service = services.find(s => s.id === id) ?? (cita ? services.find(s => s.id === appointments.find(a => a.id === cita)?.serviceId) : undefined);
  const existing = cita ? appointments.find(a => a.id === cita) : undefined;
  const isPro = session?.role === 'manicurista';
  const today = todayStr();
  const maxDate = format(addDays(new Date(), 60), 'yyyy-MM-dd');

  const [date, setDate] = useState(() => {
    if (existing && existing.date >= today) return existing.date;
    for (let i = 0; i <= 60; i++) {
      const d = format(addDays(new Date(), i), 'yyyy-MM-dd');
      if (isDayOpen(d, schedule)) return d;
    }
    return today;
  });
  const [time, setTime] = useState<string | null>(existing && existing.date === date ? existing.time : null);
  const [modality, setModality] = useState<Modality>(existing?.modality ?? 'local');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    existing?.latitude != null && existing?.longitude != null ? { latitude: existing.latitude, longitude: existing.longitude } : null
  );
  const [referenceUri, setReferenceUri] = useState<string | undefined>(undefined);
  const [keepPhoto, setKeepPhoto] = useState(Boolean(existing?.referencePhoto));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const duration = service?.duration ?? existing?.duration ?? 60;

  const slots = useMemo(
    () => (service ? getSlots(date, duration, schedule, appointments, existing?.id) : []),
    [date, service, duration, schedule, appointments, existing?.id]
  );

  const marked = useMemo(() => {
    const m: Record<string, { disabled?: boolean; disableTouchEvent?: boolean; selected?: boolean; selectedColor?: string }> = {};
    for (let i = 0; i <= 60; i++) {
      const d = format(addDays(new Date(), i), 'yyyy-MM-dd');
      if (!isDayOpen(d, schedule)) m[d] = { disabled: true, disableTouchEvent: true };
    }
    m[date] = { ...(m[date] ?? {}), selected: true, selectedColor: colors.primary };
    return m;
  }, [schedule, date]);

  if (!service || !session) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Servicio no disponible" text="Este servicio ya no está en el catálogo." />
      </Screen>
    );
  }

  const fee = modality === 'domicilio' && business.homeService ? business.homeServiceFee : 0;
  const total = service.price + fee;
  const photo = referenceUri ?? (keepPhoto ? existing?.referencePhoto : undefined);

  const locateMe = async () => {
    setLocating(true);
    try {
      const loc = await currentLocation();
      if (loc) {
        setCoords({ latitude: loc.latitude, longitude: loc.longitude });
        if (loc.address) setAddress(loc.address);
      }
    } catch {
      Alert.alert('Ubicación', 'No pudimos obtener tu ubicación. Escribe la dirección manualmente.');
    } finally {
      setLocating(false);
    }
  };

  const choosePhoto = async () => {
    const uri = await askImage('Diseño de referencia');
    if (uri) {
      setReferenceUri(uri);
      setKeepPhoto(true);
    }
  };

  const confirm = async () => {
    if (!time) {
      Alert.alert('Elige una hora', 'Selecciona uno de los horarios disponibles.');
      return;
    }
    if (modality === 'domicilio' && address.trim().length < 5) {
      Alert.alert('Dirección', 'Escribe la dirección donde quieres el servicio.');
      return;
    }

    setSaving(true);
    try {
      if (existing) {
        const updated = await updateAppointment(existing.id, {
          date,
          time,
          modality,
          address: modality === 'domicilio' ? address.trim() : null,
          latitude: modality === 'domicilio' ? coords?.latitude ?? null : null,
          longitude: modality === 'domicilio' ? coords?.longitude ?? null : null,
          notes: notes.trim() || null,
          referenceUri: referenceUri ?? undefined,
          referencePath: !referenceUri && !keepPhoto ? null : undefined,
        });
        router.replace({ pathname: '/confirmacion/[id]', params: { id: updated.id, tipo: 'reprogramada' } });
      } else {
        const created = await addAppointment({
          serviceId: service.id,
          date,
          time,
          modality,
          address: modality === 'domicilio' ? address.trim() : undefined,
          latitude: modality === 'domicilio' ? coords?.latitude : undefined,
          longitude: modality === 'domicilio' ? coords?.longitude : undefined,
          notes: notes.trim() || undefined,
          referenceUri,
        });
        router.replace({ pathname: '/confirmacion/[id]', params: { id: created.id } });
      }
    } catch (e) {
      Alert.alert('No pudimos guardar la cita', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const anyAvailable = slots.some(s => s.available);

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Reprogramar cita' : 'Reservar cita' }} />
      <ServiceCard service={service} />

      {existing ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.noticeText}>
            Horario actual: {longDate(existing.date)} a las {time12(existing.time)}
          </Text>
        </View>
      ) : null}

      <SectionTitle title="Elige el día" />
      <Card style={styles.calendarCard}>
        <Calendar
          current={date}
          minDate={today}
          maxDate={maxDate}
          onDayPress={d => {
            setDate(d.dateString);
            setTime(null);
          }}
          markedDates={marked}
          firstDay={1}
          enableSwipeMonths
          theme={calendarTheme}
        />
      </Card>

      <SectionTitle title={`Horarios · ${friendlyDate(date)}`} />
      {slots.length === 0 ? (
        <Card>
          <EmptyState icon="moon-outline" title="Sin atención este día" text="Elige otra fecha en el calendario." />
        </Card>
      ) : !anyAvailable ? (
        <Card>
          <EmptyState icon="hourglass-outline" title="Agenda llena" text="Ya no quedan espacios libres este día. Prueba con otra fecha." />
        </Card>
      ) : (
        <View style={styles.slots}>
          {slots.map(s => (
            <Pressable key={s.time} disabled={!s.available} onPress={() => setTime(s.time)} style={[styles.slot, !s.available && styles.slotOff, time === s.time && styles.slotOn]}>
              <Text style={[styles.slotText, !s.available && styles.slotTextOff, time === s.time && styles.slotTextOn]}>{time12(s.time)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!isPro ? (
        <>
          <SectionTitle title="¿Dónde será el servicio?" />
          <View style={styles.modes}>
            <ModeOption icon="storefront-outline" title="En el estudio" text={business.address} selected={modality === 'local'} onPress={() => setModality('local')} />
            {business.homeService ? (
              <ModeOption icon="car-outline" title="A domicilio" text={`Recargo de ${money(business.homeServiceFee)}`} selected={modality === 'domicilio'} onPress={() => setModality('domicilio')} />
            ) : null}
          </View>
          {modality === 'domicilio' ? (
            <Card style={{ marginTop: 12 }}>
              <Input label="Dirección" icon="home-outline" placeholder="Calle, número, apartamento" value={address} onChangeText={setAddress} />
              <Button small variant="secondary" icon="locate-outline" title="Usar mi ubicación actual" loading={locating} onPress={locateMe} />
            </Card>
          ) : null}

          <SectionTitle title="Diseño de referencia" />
          {photo ? (
            <View>
              <Image source={{ uri: photo }} style={styles.photo} />
              <View style={styles.photoActions}>
                <Button small variant="secondary" icon="refresh" title="Cambiar" style={styles.flex} onPress={choosePhoto} />
                <Button
                  small
                  variant="danger"
                  icon="trash-outline"
                  title="Quitar"
                  style={styles.flex}
                  onPress={() => {
                    setReferenceUri(undefined);
                    setKeepPhoto(false);
                  }}
                />
              </View>
            </View>
          ) : (
            <Card onPress={choosePhoto} style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={30} color={colors.primary} />
              <Text style={styles.photoTitle}>Agregar foto de referencia</Text>
              <Text style={styles.photoText}>Opcional · desde la cámara o tu galería</Text>
            </Card>
          )}

          <SectionTitle title="Notas para la manicurista" />
          <Input placeholder="Ej: tengo uñas cortas y quiero tonos pastel" value={notes} onChangeText={setNotes} multiline />
        </>
      ) : null}

      <SectionTitle title="Resumen" />
      <Card>
        <Row label="Servicio" value={service.name} />
        <Row label="Fecha" value={longDate(date)} />
        <Row label="Hora" value={time ? time12(time) : 'Sin seleccionar'} />
        <Row label="Lugar" value={modality === 'domicilio' ? 'A domicilio' : 'En el estudio'} />
        <View style={styles.divider} />
        <Row label="Precio del servicio" value={money(service.price)} />
        {fee > 0 ? <Row label="Recargo a domicilio" value={money(fee)} /> : null}
        <Row label="Total" value={money(total)} strong />
      </Card>

      <Button
        title={existing ? 'Guardar nuevo horario' : 'Confirmar reserva'}
        icon="checkmark-circle-outline"
        onPress={confirm}
        loading={saving}
        disabled={!time}
        style={{ marginTop: 22 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.soft, padding: 14, borderRadius: radius.md },
  noticeText: { flex: 1, fontSize: 14, color: colors.primaryDark, fontWeight: '600' },
  calendarCard: { padding: 8 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '31%', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center' },
  slotOff: { backgroundColor: '#F6F1F3', borderColor: '#F6F1F3' },
  slotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 14, fontWeight: '700', color: colors.text },
  slotTextOff: { color: '#C9B8C0', textDecorationLine: 'line-through' },
  slotTextOn: { color: colors.white },
  modes: { flexDirection: 'row', gap: 10 },
  mode: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, gap: 4 },
  modeActive: { borderColor: colors.primary, backgroundColor: colors.softer },
  modeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  modeIconActive: { backgroundColor: colors.primary },
  modeTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  modeText: { fontSize: 12, color: colors.muted },
  photo: { width: '100%', height: 220, borderRadius: radius.lg },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  photoEmpty: { alignItems: 'center', gap: 6, paddingVertical: 24, borderStyle: 'dashed', borderWidth: 1.5 },
  photoTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  photoText: { fontSize: 12, color: colors.muted },
  flex: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
});
