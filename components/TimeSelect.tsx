import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { time12, toTime } from '../lib/format';

const TIMES = Array.from({ length: 33 }, (_, i) => toTime(6 * 60 + i * 30));

export function TimeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.8 }]}>
        <Ionicons name="time-outline" size={15} color={colors.primaryDark} />
        <Text style={styles.pillText}>{time12(value)}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>Selecciona la hora</Text>
            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
              {TIMES.map(t => (
                <Pressable
                  key={t}
                  onPress={() => {
                    onChange(t);
                    setOpen(false);
                  }}
                  style={[styles.option, t === value && styles.optionActive]}
                >
                  <Text style={[styles.optionText, t === value && styles.optionTextActive]}>{time12(t)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.soft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  pillText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  backdrop: { flex: 1, backgroundColor: 'rgba(58,40,48,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 20, maxHeight: '75%' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  option: { width: '30%', paddingVertical: 11, borderRadius: radius.sm, backgroundColor: colors.softer, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 13, fontWeight: '600', color: colors.text },
  optionTextActive: { color: colors.white },
});
