import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { dayNumber, monthShort, time12 } from '../lib/format';
import { Appointment } from '../lib/types';
import { Card, StatusBadge } from './ui';

export function AppointmentCard({ appointment, subtitle, onPress, children }: { appointment: Appointment; subtitle: string; onPress?: () => void; children?: ReactNode }) {
  const off = appointment.status === 'cancelada';
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dateBox, off && styles.dateBoxOff]}>
          <Text style={[styles.day, off && styles.textOff]}>{dayNumber(appointment.date)}</Text>
          <Text style={[styles.month, off && styles.textOff]}>{monthShort(appointment.date)}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {appointment.serviceName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <Text style={styles.metaText}>{time12(appointment.time)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name={appointment.modality === 'domicilio' ? 'car-outline' : 'storefront-outline'} size={14} color={colors.muted} />
              <Text style={styles.metaText}>{appointment.modality === 'domicilio' ? 'Domicilio' : 'Estudio'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.badge}>
          <StatusBadge status={appointment.status} />
        </View>
      </View>
      {children ? <View style={styles.children}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dateBox: { width: 56, height: 64, borderRadius: radius.md, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  dateBoxOff: { backgroundColor: '#F3EEF0' },
  day: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  month: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.6 },
  textOff: { color: '#B9A8B0' },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  meta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  badge: { alignSelf: 'flex-start' },
  children: { marginTop: 14 },
});
