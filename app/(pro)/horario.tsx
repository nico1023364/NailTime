import { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { TimeSelect } from '../../components/TimeSelect';
import { Card, Chip, Screen, SectionTitle } from '../../components/ui';
import { calendarTheme, colors } from '../../constants/theme';
import { errorMessage } from '../../lib/errors';
import { DAY_NAMES, DAY_ORDER, isUpcoming, shortDate, toMin, todayStr } from '../../lib/format';
import { useStore } from '../../lib/store';
import { Alert } from '../../lib/alert';

const STEPS = [15, 30, 60];

export default function Horario() {
  const schedule = useStore(s => s.schedule);
  const appointments = useStore(s => s.appointments);
  const updateDay = useStore(s => s.updateDay);
  const updateSchedule = useStore(s => s.updateSchedule);
  const toggleBlockedDate = useStore(s => s.toggleBlockedDate);
  const today = todayStr();

  const invalid = () => Alert.alert('Horario', 'La hora final debe ser posterior a la hora de inicio.');

  const apply = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (e) {
      Alert.alert('No pudimos guardar el horario', errorMessage(e));
    }
  };

  const setDayTime = (i: number, key: 'start' | 'end', value: string) => {
    const d = schedule.days[i];
    const start = key === 'start' ? value : d.start;
    const end = key === 'end' ? value : d.end;
    if (toMin(end) <= toMin(start)) return invalid();
    void apply(() => updateDay(i, key === 'start' ? { start: value } : { end: value }));
  };

  const setBreak = (key: 'breakStart' | 'breakEnd', value: string) => {
    const start = key === 'breakStart' ? value : schedule.breakStart;
    const end = key === 'breakEnd' ? value : schedule.breakEnd;
    if (toMin(end) <= toMin(start)) return invalid();
    void apply(() => updateSchedule(key === 'breakStart' ? { breakStart: value } : { breakEnd: value }));
  };

  const onBlock = (date: string) => {
    const blocked = schedule.blockedDates.includes(date);
    const count = appointments.filter(a => a.date === date && isUpcoming(a)).length;
    if (!blocked && count > 0) {
      Alert.alert('Este día tiene citas', `Hay ${count} cita(s) activa(s) este día. Bloquearlo evita nuevas reservas, pero no cancela las existentes.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Bloquear', onPress: () => void apply(() => toggleBlockedDate(date)) },
      ]);
      return;
    }
    void apply(() => toggleBlockedDate(date));
  };

  const upcomingBlocked = schedule.blockedDates.filter(d => d >= today).sort();
  const marked = useMemo(
    () => Object.fromEntries(schedule.blockedDates.map(d => [d, { selected: true, selectedColor: colors.danger }])),
    [schedule.blockedDates]
  );

  return (
    <Screen>
      <Text style={styles.intro}>Define cuándo pueden reservar tus clientas. Los cambios se aplican de inmediato.</Text>

      <SectionTitle title="Días de atención" />
      <Card style={styles.daysCard}>
        {DAY_ORDER.map((i, idx) => {
          const d = schedule.days[i];
          return (
            <View key={i} style={[styles.day, idx > 0 && styles.divider]}>
              <View style={styles.dayHead}>
                <Text style={[styles.dayName, !d.active && styles.off]}>{DAY_NAMES[i]}</Text>
                <Switch value={d.active} onValueChange={v => void apply(() => updateDay(i, { active: v }))} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
              </View>
              {d.active ? (
                <View style={styles.times}>
                  <TimeSelect value={d.start} onChange={t => setDayTime(i, 'start', t)} />
                  <Text style={styles.to}>a</Text>
                  <TimeSelect value={d.end} onChange={t => setDayTime(i, 'end', t)} />
                </View>
              ) : (
                <Text style={styles.closed}>Cerrado</Text>
              )}
            </View>
          );
        })}
      </Card>

      <SectionTitle title="Descanso" />
      <Card>
        <View style={styles.dayHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dayName}>Pausa de almuerzo</Text>
            <Text style={styles.small}>No se podrán reservar turnos en este rango</Text>
          </View>
          <Switch value={schedule.hasBreak} onValueChange={v => void apply(() => updateSchedule({ hasBreak: v }))} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </View>
        {schedule.hasBreak ? (
          <View style={[styles.times, { marginTop: 14 }]}>
            <TimeSelect value={schedule.breakStart} onChange={t => setBreak('breakStart', t)} />
            <Text style={styles.to}>a</Text>
            <TimeSelect value={schedule.breakEnd} onChange={t => setBreak('breakEnd', t)} />
          </View>
        ) : null}
      </Card>

      <SectionTitle title="Intervalo entre turnos" />
      <View style={styles.chips}>
        {STEPS.map(s => (
          <Chip key={s} label={`Cada ${s} min`} selected={schedule.step === s} onPress={() => void apply(() => updateSchedule({ step: s }))} />
        ))}
      </View>

      <SectionTitle title="Bloquear fechas" />
      <Card>
        <Text style={styles.small}>Toca un día para bloquearlo o desbloquearlo: vacaciones, festivos o compromisos personales.</Text>
        <Calendar minDate={today} onDayPress={d => onBlock(d.dateString)} markedDates={marked} firstDay={1} enableSwipeMonths theme={calendarTheme} />
        {upcomingBlocked.length > 0 ? (
          <View style={[styles.chips, { marginTop: 12 }]}>
            {upcomingBlocked.map(d => (
              <Chip key={d} label={shortDate(d)} icon="close" selected onPress={() => void apply(() => toggleBlockedDate(d))} />
            ))}
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  daysCard: { paddingVertical: 4 },
  day: { paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontSize: 15, fontWeight: '700', color: colors.text },
  off: { color: colors.muted },
  times: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  to: { fontSize: 14, color: colors.muted },
  closed: { fontSize: 13, color: colors.danger, marginTop: 4, fontWeight: '600' },
  small: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
