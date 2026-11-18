import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { AppointmentCard } from '../../components/AppointmentCard';
import { Avatar, Button, Card, EmptyState, IconName, Screen, SectionTitle } from '../../components/ui';
import { FadeIn, PopIn } from '../../components/animation';
import { FloatingIcon, PulseBadge, StaggerItem } from '../../components/animations';
import { calendarTheme, colors, radius } from '../../constants/theme';
import { errorMessage } from '../../lib/errors';
import { compareAppointments, firstName, friendlyDate, isUpcoming, longDate, money, todayStr } from '../../lib/format';
import { isDayOpen } from '../../lib/slots';
import { useStore } from '../../lib/store';
import { Alert } from '../../lib/alert';

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export default function Agenda() {
  const session = useStore(s => s.session);
  const appointments = useStore(s => s.appointments);
  const schedule = useStore(s => s.schedule);
  const updateAppointment = useStore(s => s.updateAppointment);
  const today = todayStr();
  const [selected, setSelected] = useState(today);

  const todays = useMemo(() => appointments.filter(a => a.date === today && a.status !== 'cancelada'), [appointments, today]);
  const pending = useMemo(() => appointments.filter(a => a.status === 'pendiente' && isUpcoming(a)).sort(compareAppointments), [appointments]);
  const income = todays.reduce((t, a) => t + a.price, 0);
  const dayList = useMemo(() => appointments.filter(a => a.date === selected).sort(compareAppointments), [appointments, selected]);
  const open = isDayOpen(selected, schedule);

  const marked = useMemo(() => {
    const m: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    schedule.blockedDates.forEach(d => {
      m[d] = { marked: true, dotColor: colors.danger };
    });
    appointments.forEach(a => {
      if (a.status !== 'cancelada') m[a.date] = { marked: true, dotColor: colors.primary };
    });
    m[selected] = { ...(m[selected] ?? {}), selected: true, selectedColor: colors.primary };
    return m;
  }, [appointments, schedule.blockedDates, selected]);

  const changeStatus = async (id: string, status: 'confirmada' | 'cancelada') => {
    try {
      await updateAppointment(id, { status });
    } catch (e) {
      Alert.alert('No pudimos actualizar la cita', errorMessage(e));
    }
  };

  const reject = (id: string) =>
    Alert.alert('Rechazar reserva', 'La cita quedará cancelada y el horario volverá a estar disponible.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: () => void changeStatus(id, 'cancelada') },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen>
        <FadeIn style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hola, {firstName(session?.name ?? '')}</Text>
            <Text style={styles.date}>{longDate(today)}</Text>
          </View>
          <PopIn delay={100}>
            <Avatar name={session?.name ?? ''} />
          </PopIn>
          <FloatingIcon name="sparkles-outline" size={20} color={colors.gold} amplitude={5} style={styles.headerSparkle} />
        </FadeIn>

        <View style={styles.stats}>
          <StaggerItem index={0} style={styles.flex}><Stat icon="calendar" value={String(todays.length)} label="Citas hoy" /></StaggerItem>
          <StaggerItem index={1} style={styles.flex}>
            <PulseBadge><Stat icon="hourglass" value={String(pending.length)} label="Por confirmar" /></PulseBadge>
          </StaggerItem>
          <StaggerItem index={2} style={styles.flex}><Stat icon="cash" value={money(income)} label="Ingresos hoy" /></StaggerItem>
        </View>

        {pending.length > 0 ? (
          <>
            <SectionTitle title="Reservas por confirmar" />
            {pending.map((a, i) => (
              <StaggerItem key={a.id} index={i}>
                <AppointmentCard appointment={a} subtitle={`${a.clientName} · ${friendlyDate(a.date)}`} onPress={() => router.push(`/cita/${a.id}`)}>
                  <View style={styles.actions}>
                    <Button small title="Confirmar" icon="checkmark" variant="success" style={styles.flex} onPress={() => void changeStatus(a.id, 'confirmada')} />
                    <Button small title="Rechazar" icon="close" variant="danger" style={styles.flex} onPress={() => reject(a.id)} />
                  </View>
                </AppointmentCard>
              </StaggerItem>
            ))}
          </>
        ) : null}

        <SectionTitle title="Calendario" />
        <Card style={styles.calendarCard}>
          <Calendar current={selected} onDayPress={d => setSelected(d.dateString)} markedDates={marked} firstDay={1} enableSwipeMonths theme={calendarTheme} />
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Con citas</Text>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>Bloqueado</Text>
          </View>
        </Card>

        <SectionTitle title={friendlyDate(selected)} />
        {dayList.length === 0 ? (
          <Card>
            <EmptyState
              icon={open ? 'sunny-outline' : 'moon-outline'}
              title={open ? 'Sin citas este día' : 'Día sin atención'}
              text={open ? 'Cuando una clienta reserve, la cita aparecerá aquí.' : schedule.blockedDates.includes(selected) ? 'Bloqueaste este día desde tu horario.' : 'Este día no tienes atención configurada.'}
            />
          </Card>
        ) : (
          dayList.map((a, i) => (
            <StaggerItem key={a.id} index={i}>
              <AppointmentCard appointment={a} subtitle={a.clientName} onPress={() => router.push(`/cita/${a.id}`)} />
            </StaggerItem>
          ))
        )}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hello: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  date: { fontSize: 15, color: colors.muted, marginTop: 2 },
  headerSparkle: { position: 'absolute', right: 54, top: -10 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 20 },
  stat: { flex: 1, padding: 12 },
  statIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  calendarCard: { padding: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.muted, marginRight: 10 },
});
