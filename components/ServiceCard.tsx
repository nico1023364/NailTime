import { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { formatDuration, money } from '../lib/format';
import { Service } from '../lib/types';
import { Card, IconName } from './ui';

export function ServiceCard({ service, onPress, right, dimmed }: { service: Service; onPress?: () => void; right?: ReactNode; dimmed?: boolean }) {
  return (
    <Card onPress={onPress} style={[styles.card, dimmed && styles.dimmed]}>
      {service.photo ? (
        <Image source={{ uri: service.photo }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.iconThumb]}>
          <Ionicons name={service.icon as IconName} size={28} color={colors.primary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {service.name}
        </Text>
        <Text style={styles.desc} numberOfLines={2}>
          {service.description}
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{formatDuration(service.duration)}</Text>
          </View>
          <Text style={styles.price}>{money(service.price)}</Text>
        </View>
      </View>
      {right}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  dimmed: { opacity: 0.55 },
  thumb: { width: 66, height: 66, borderRadius: radius.md },
  iconThumb: { backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  desc: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: colors.muted },
  price: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
});
