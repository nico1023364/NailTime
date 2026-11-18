import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import BusinessMap from './BusinessMap';
import { Button, Card, Input, SectionTitle } from './ui';
import { colors, radius } from '../constants/theme';
import { errorMessage } from '../lib/errors';
import { currentLocation } from '../lib/native';
import type { Business, BusinessInput } from '../lib/types';
import { Alert } from '../lib/alert';

interface Props {
  initial: Business;
  submitLabel: string;
  onSubmit: (values: BusinessInput) => Promise<void>;
}

export function BusinessForm({ initial, submitLabel, onSubmit }: Props) {
  const [form, setForm] = useState({
    name: initial.name,
    bio: initial.bio,
    phone: initial.phone,
    whatsapp: initial.whatsapp,
    address: initial.address,
    city: initial.city,
    fee: String(initial.homeServiceFee),
  });
  const [homeService, setHomeService] = useState(initial.homeService);
  const [coords, setCoords] = useState({ latitude: initial.latitude, longitude: initial.longitude });
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const field = (key: keyof typeof form) => (value: string) => setForm(f => ({ ...f, [key]: value }));

  const locate = async () => {
    setLocating(true);
    try {
      const loc = await currentLocation();
      if (!loc) return;
      setCoords({ latitude: loc.latitude, longitude: loc.longitude });
      if (loc.address) setForm(f => ({ ...f, address: loc.address as string }));
    } catch {
      Alert.alert('Ubicación', 'No fue posible obtener tu ubicación.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (form.name.trim().length < 3) return Alert.alert('Nombre', 'Escribe el nombre de tu negocio.');
    if (!/^3\d{9}$/.test(form.phone.trim())) return Alert.alert('Teléfono', 'Ingresa un celular válido de 10 dígitos.');
    if (!/^3\d{9}$/.test(form.whatsapp.trim())) return Alert.alert('WhatsApp', 'Ingresa un número de WhatsApp válido de 10 dígitos.');
    if (form.address.trim().length < 5) return Alert.alert('Dirección', 'Escribe la dirección donde atiendes.');
    if (form.city.trim().length < 2) return Alert.alert('Ciudad', 'Escribe la ciudad donde atiendes.');

    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        owner: initial.owner,
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        bio: form.bio.trim(),
        homeService,
        homeServiceFee: Number(form.fee.replace(/\D/g, '')) || 0,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } catch (e) {
      Alert.alert('No pudimos guardar', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle title="Perfil del negocio" />
      <Card>
        <Input label="Nombre del negocio" icon="storefront-outline" value={form.name} onChangeText={field('name')} placeholder="Ej: Estudio Valentina" />
        <Input label="Descripción" value={form.bio} onChangeText={field('bio')} multiline placeholder="Cuéntale a tus clientas qué te hace especial" />
      </Card>

      <SectionTitle title="Contacto" />
      <Card>
        <Input label="Teléfono" icon="call-outline" keyboardType="phone-pad" maxLength={10} value={form.phone} onChangeText={field('phone')} placeholder="3001234567" />
        <Input label="WhatsApp" icon="logo-whatsapp" keyboardType="phone-pad" maxLength={10} value={form.whatsapp} onChangeText={field('whatsapp')} placeholder="3001234567" />
      </Card>

      <SectionTitle title="Ubicación" />
      <Card>
        <Input label="Dirección" icon="location-outline" value={form.address} onChangeText={field('address')} placeholder="Calle, número, barrio" />
        <Input label="Ciudad" icon="business-outline" value={form.city} onChangeText={field('city')} placeholder="Bogotá" />
        <View style={styles.mapWrap}>
          <BusinessMap
            latitude={coords.latitude}
            longitude={coords.longitude}
            title={form.name || 'Mi negocio'}
            description={form.address}
            height={200}
            interactive={false}
            draggable
            onCoordinateChange={setCoords}
          />
        </View>
        <Text style={styles.hint}>Arrastra el pin para ajustar la ubicación exacta. En web usa “Usar mi ubicación actual”.</Text>
        <View style={styles.coordsRow}>
          <Text style={styles.coords}>
            {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          </Text>
          <Button small variant="secondary" icon="locate-outline" title="Usar mi ubicación" loading={locating} onPress={locate} />
        </View>
      </Card>

      <SectionTitle title="Servicio a domicilio" />
      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Atiendo a domicilio</Text>
            <Text style={styles.hintInline}>Tus clientas podrán elegir esta opción al reservar</Text>
          </View>
          <Switch value={homeService} onValueChange={setHomeService} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
        </View>
        {homeService ? (
          <View style={{ marginTop: 14 }}>
            <Input label="Recargo por domicilio" icon="cash-outline" keyboardType="number-pad" value={form.fee} onChangeText={field('fee')} placeholder="10000" />
          </View>
        ) : null}
      </Card>

      <Button
        title={submitLabel}
        icon="checkmark-circle-outline"
        loading={saving}
        onPress={save}
        style={{ marginTop: 26 }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  mapWrap: { borderRadius: radius.md, overflow: 'hidden' },
  hint: { fontSize: 12, color: colors.muted, marginTop: 10 },
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  coords: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.primaryDark },
  hintInline: { fontSize: 12, color: colors.muted, marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
});
