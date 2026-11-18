import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, type MapViewProps } from 'react-native-maps';
import { colors, radius, shadow } from '../constants/theme';
import { Button, IconBadge } from './ui';
import type { BusinessMapProps, MapCoordinate } from './mapTypes';

const MAP_TIMEOUT = 9000;
const DELTA = { latitudeDelta: 0.009, longitudeDelta: 0.009 };
const MAPS_ENABLED = Constants.expoConfig?.extra?.mapsEnabled === true;

export default function BusinessMap({
  latitude,
  longitude,
  title,
  description,
  interactive = true,
  draggable = false,
  showsUserLocation = false,
  height = 230,
  fill = false,
  onCoordinateChange,
  style,
}: BusinessMapProps) {
  const mapRef = useRef<MapView>(null);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!MAPS_ENABLED);

  useEffect(() => {
    if (!MAPS_ENABLED || ready) return;
    const timer = setTimeout(() => setFailed(true), MAP_TIMEOUT);
    return () => clearTimeout(timer);
  }, [attempt, ready]);

  useEffect(() => {
    if (!ready) return;
    mapRef.current?.animateToRegion({ latitude, longitude, ...DELTA }, 450);
  }, [latitude, longitude, ready]);

  const retry = () => {
    setReady(false);
    setFailed(false);
    setAttempt(value => value + 1);
  };

  const openExternal = () =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`).catch(() => {});

  const handleDragEnd = (coordinate?: MapCoordinate) => {
    if (!coordinate) return;
    onCoordinateChange?.(coordinate);
  };

  const mapProps: Partial<MapViewProps> = interactive
    ? {}
    : { scrollEnabled: false, zoomEnabled: false, rotateEnabled: false, pitchEnabled: false, toolbarEnabled: false };

  return (
    <View style={[styles.wrap, fill ? styles.fill : { height }, style]}>
      {MAPS_ENABLED ? (
        <MapView
          key={attempt}
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude, longitude, ...DELTA }}
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={false}
          showsCompass={interactive}
          loadingEnabled
          loadingBackgroundColor={colors.softer}
          loadingIndicatorColor={colors.primary}
          onMapReady={() => {
            setReady(true);
            setFailed(false);
          }}
          onMapLoaded={() => {
            setReady(true);
            setFailed(false);
          }}
          {...mapProps}
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title={title}
            description={description}
            pinColor={colors.primary}
            draggable={draggable}
            onDragEnd={event => handleDragEnd(event.nativeEvent.coordinate)}
          />
        </MapView>
      ) : null}

      {!failed ? (
        <Pressable onPress={openExternal} style={({ pressed }) => [styles.external, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Abrir en Google Maps">
          <Ionicons name="open-outline" size={13} color={colors.primaryDark} />
          <Text style={styles.externalText}>Google Maps</Text>
        </Pressable>
      ) : (
        <View style={styles.fallback}>
          <IconBadge icon="map-outline" size={52} />
          <Text style={styles.fallbackTitle}>{MAPS_ENABLED ? 'El mapa no cargó' : 'Ubicación del estudio'}</Text>
          <Text style={styles.fallbackText}>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
          <Text style={styles.fallbackHint}>
            {MAPS_ENABLED
              ? 'Puedes ver la ubicación exacta en Google Maps.'
              : 'Abre Google Maps para ver la ruta y la ubicación exacta.'}
          </Text>
          <View style={styles.fallbackActions}>
            <Button small title="Abrir mapa" icon="navigate-outline" onPress={openExternal} style={styles.flex} />
            {MAPS_ENABLED ? (
              <Button small variant="secondary" title="Reintentar" icon="refresh-outline" onPress={retry} style={styles.flex} />
            ) : null}
          </View>
        </View>
      )}
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
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 18,
    backgroundColor: colors.softer,
  },
  fallbackTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },
  fallbackText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  fallbackHint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  fallbackActions: { flexDirection: 'row', gap: 8, marginTop: 8, alignSelf: 'stretch' },
  flex: { flex: 1 },
});
