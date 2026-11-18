import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { Button, Card, Chip, IconName, Input, Screen, SectionTitle } from '../components/ui';
import { colors, radius } from '../constants/theme';
import { errorMessage } from '../lib/errors';
import { formatDuration } from '../lib/format';
import { askImage } from '../lib/native';
import { useStore } from '../lib/store';
import { Alert } from '../lib/alert';

const CATEGORIES = ['Manos', 'Pies', 'Diseño', 'Extras'];
const DURATIONS = [30, 45, 60, 75, 90, 120, 150];
const ICONS: IconName[] = ['hand-left-outline', 'color-palette-outline', 'diamond-outline', 'water-outline', 'brush-outline', 'sparkles-outline', 'flower-outline', 'heart-outline'];

const schema = z.object({
  name: z.string().trim().min(3, 'Escribe el nombre del servicio'),
  description: z.string().trim().min(5, 'Agrega una descripción corta'),
  price: z.number().min(1000, 'Ingresa un precio válido'),
});

export default function ServicioForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const services = useStore(s => s.services);
  const saveService = useStore(s => s.saveService);
  const deleteService = useStore(s => s.deleteService);
  const existing = services.find(s => s.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'Manos');
  const [duration, setDuration] = useState(existing?.duration ?? 60);
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [icon, setIcon] = useState<string>(existing?.icon ?? 'sparkles-outline');
  const [photoPath, setPhotoPath] = useState<string | null>(existing?.photoPath ?? null);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const photo = photoUri ?? existing?.photo;

  const save = async () => {
    const r = schema.safeParse({ name, description, price: Number(price.replace(/\D/g, '')) });
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach(i => {
        const k = String(i.path[0]);
        if (!e[k]) e[k] = i.message;
      });
      setErrors(e);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await saveService({
        id: existing?.id,
        name: r.data.name,
        description: r.data.description,
        price: r.data.price,
        category,
        duration,
        icon,
        active: existing?.active ?? true,
        photoUri,
        photoPath,
      });
      router.back();
    } catch (e) {
      Alert.alert('No pudimos guardar el servicio', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Eliminar servicio', 'Las citas ya reservadas se mantienen, pero el servicio dejará de aparecer en el catálogo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteService(existing.id);
            router.back();
          } catch (e) {
            Alert.alert('No pudimos eliminar el servicio', errorMessage(e));
          }
        },
      },
    ]);
  };

  const choosePhoto = async () => {
    const uri = await askImage('Foto del servicio');
    if (uri) setPhotoUri(uri);
  };

  const clearPhoto = () => {
    setPhotoUri(undefined);
    setPhotoPath(null);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Editar servicio' : 'Nuevo servicio' }} />

      <Pressable onPress={choosePhoto} style={styles.photoBox}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons name={icon as IconName} size={40} color={colors.primary} />
            <Text style={styles.photoText}>Toca para agregar una foto</Text>
          </View>
        )}
      </Pressable>
      {photo ? <Button small variant="ghost" icon="trash-outline" title="Quitar foto" onPress={clearPhoto} /> : null}

      <Card style={{ marginTop: 12 }}>
        <Input label="Nombre" placeholder="Ej: Manicure semipermanente" value={name} onChangeText={setName} error={errors.name} />
        <Input label="Descripción" placeholder="¿Qué incluye el servicio?" value={description} onChangeText={setDescription} multiline error={errors.description} />
        <Input label="Precio (COP)" icon="cash-outline" placeholder="45000" keyboardType="number-pad" value={price} onChangeText={setPrice} error={errors.price} />
      </Card>

      <SectionTitle title="Categoría" />
      <View style={styles.chips}>
        {CATEGORIES.map(c => (
          <Chip key={c} label={c} selected={c === category} onPress={() => setCategory(c)} />
        ))}
      </View>

      <SectionTitle title="Duración" />
      <View style={styles.chips}>
        {DURATIONS.map(d => (
          <Chip key={d} label={formatDuration(d)} selected={d === duration} onPress={() => setDuration(d)} />
        ))}
      </View>

      {!photo ? (
        <>
          <SectionTitle title="Ícono" />
          <View style={styles.icons}>
            {ICONS.map(i => (
              <Pressable key={i} onPress={() => setIcon(i)} style={[styles.iconOption, icon === i && styles.iconActive]}>
                <Ionicons name={i} size={24} color={icon === i ? colors.white : colors.primary} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Button
        title={existing ? 'Guardar cambios' : 'Crear servicio'}
        icon="checkmark-circle-outline"
        loading={saving}
        onPress={save}
        style={{ marginTop: 28 }}
      />
      {existing ? <Button title="Eliminar servicio" icon="trash-outline" variant="danger" onPress={remove} style={{ marginTop: 12 }} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoBox: { height: 170, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.soft, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  photo: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoText: { fontSize: 14, color: colors.primaryDark, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconOption: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.primary },
});
