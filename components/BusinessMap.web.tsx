import { createElement } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../constants/theme';
import type { BusinessMapProps } from './mapTypes';

const DELTA = 0.006;

/**
 * Web fallback. `react-native-maps` has no web implementation, so we render an
 * OpenStreetMap embed instead. This works in the browser without API keys.
 */
export default function BusinessMap({
  latitude,
  longitude,
  title,
  interactive = true,
  height = 230,
  fill = false,
  style,
}: BusinessMapProps) {
  const bbox = [longitude - DELTA, latitude - DELTA, longitude + DELTA, latitude + DELTA].join('%2C');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const external = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;

  return (
    <View style={[styles.wrap, fill ? styles.fill : { height }, style]}>
      <View style={styles.frame} pointerEvents={interactive ? 'auto' : 'none'}>
        {createElement('iframe', {
          src,
          title: title ? `Mapa de ${title}` : 'Mapa de ubicación',
          loading: 'lazy',
          referrerPolicy: 'no-referrer-when-downgrade',
          style: { border: 0, width: '100%', height: '100%', display: 'block' },
        })}
      </View>
      <Pressable
        onPress={() => Linking.openURL(external).catch(() => {})}
        style={({ pressed }) => [styles.external, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Abrir en OpenStreetMap"
      >
        <Ionicons name="open-outline" size={13} color={colors.primaryDark} />
        <Text style={styles.externalText}>Ver mapa</Text>
      </Pressable>
      {!interactive ? <View style={styles.lock} pointerEvents="none" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  frame: { flex: 1 },
  fill: { flex: 1 },
  external: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    ...shadow,
  },
  externalText: { fontSize: 11.5, fontWeight: '800', color: colors.primaryDark },
  pressed: { opacity: 0.85 },
  lock: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },
});
