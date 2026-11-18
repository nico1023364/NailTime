import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import BusinessMap from '../../components/BusinessMap';
import { Button, IconBadge, InfoLine } from '../../components/ui';
import { colors, radius, shadow } from '../../constants/theme';
import { DAY_NAMES, DAY_ORDER, money, time12, toMin, todayStr } from '../../lib/format';
import { call, openRoute, whatsapp } from '../../lib/native';
import { useStore } from '../../lib/store';
import { Alert } from '../../lib/alert';

export default function Ubicacion() {
  const business = useStore(s => s.business);
  const schedule = useStore(s => s.schedule);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(p => setGranted(p.granted))
      .catch(() => {});
  }, []);

  const status = useMemo(() => {
    const day = schedule.days[new Date().getDay()];
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const blocked = schedule.blockedDates.includes(todayStr());
    const open = Boolean(day?.active) && !blocked && nowMin >= toMin(day.start) && nowMin < toMin(day.end);
    return { open, blocked };
  }, [schedule]);

  const askLocation = async () => {
    const p = await Location.requestForegroundPermissionsAsync();
    setGranted(p.granted);
    if (!p.granted) Alert.alert('Ubicación', 'Activa el permiso de ubicación para verte en el mapa.');
  };

  const sendWhatsapp = () =>
    whatsapp(business.whatsapp, `Hola ${business.owner}, quiero información sobre tus servicios.`);

  return (
    <View style={styles.container}>
      <BusinessMap
        latitude={business.latitude}
        longitude={business.longitude}
        title={business.name}
        description={business.address}
        showsUserLocation={granted}
        fill
        style={styles.map}
      />

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.name}>{business.name}</Text>
            <View style={[styles.status, status.open ? styles.statusOpen : styles.statusClosed]}>
              <View style={[styles.statusDot, { backgroundColor: status.open ? colors.success : colors.muted }]} />
              <Text style={[styles.statusText, { color: status.open ? colors.success : colors.muted }]}>
                {status.open ? 'Abierto ahora' : status.blocked ? 'Cerrado hoy' : 'Cerrado ahora'}
              </Text>
            </View>
          </View>
          <IconBadge icon="storefront-outline" size={48} tone="brand" />
        </View>

        <InfoLine icon="location-outline" text={`${business.address}, ${business.city}`} />
        {business.homeService ? (
          <InfoLine icon="car-outline" text={`También atiende a domicilio · recargo de ${money(business.homeServiceFee)}`} />
        ) : null}

        <View style={styles.actions}>
          <Button title="Cómo llegar" icon="navigate" style={styles.flex} onPress={() => openRoute(business.latitude, business.longitude)} />
          <Button title="WhatsApp" icon="logo-whatsapp" variant="secondary" style={styles.flex} onPress={sendWhatsapp} />
        </View>
        <View style={styles.actions}>
          <Button title="Llamar" icon="call-outline" variant="outline" style={styles.flex} onPress={() => call(business.phone)} />
          <Button
            title={granted ? 'Ubicación activa' : 'Mi ubicación'}
            icon="locate-outline"
            variant="outline"
            style={styles.flex}
            disabled={granted}
            onPress={askLocation}
          />
        </View>

        <Text style={styles.hoursTitle}>Horario de atención</Text>
        <View style={styles.hoursCard}>
          {DAY_ORDER.map(i => {
            const d = schedule.days[i];
            const isToday = new Date().getDay() === i;
            return (
              <View key={i} style={[styles.hourRow, isToday && styles.hourRowToday]}>
                <Text style={[styles.hourDay, isToday && styles.hourDayToday]}>
                  {DAY_NAMES[i]}
                  {isToday ? ' · Hoy' : ''}
                </Text>
                <Text style={[styles.hourText, !d.active && styles.closed]}>{d.active ? `${time12(d.start)} – ${time12(d.end)}` : 'Cerrado'}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderWidth: 0 },
  sheet: { maxHeight: '56%', backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -26, ...shadow },
  sheetContent: { padding: 20, paddingTop: 10, paddingBottom: 36 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  headerText: { flex: 1, gap: 7 },
  name: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  statusOpen: { backgroundColor: colors.successSoft },
  statusClosed: { backgroundColor: colors.surface },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  flex: { flex: 1 },
  hoursTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 24, marginBottom: 10 },
  hoursCard: { backgroundColor: colors.softer, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 6 },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, gap: 12 },
  hourRowToday: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  hourDay: { fontSize: 13.5, color: colors.muted },
  hourDayToday: { color: colors.primaryDark, fontWeight: '800' },
  hourText: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  closed: { color: colors.muted, fontWeight: '500' },
});
