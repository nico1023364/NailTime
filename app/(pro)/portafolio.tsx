import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Screen } from '../../components/ui';
import { FadeIn } from '../../components/animation';
import { FloatingIcon, StaggerItem, ZoomImage } from '../../components/animations';
import { colors, radius } from '../../constants/theme';
import { errorMessage } from '../../lib/errors';
import { shortDate } from '../../lib/format';
import { pickImage } from '../../lib/native';
import { useStore } from '../../lib/store';
import { Alert } from '../../lib/alert';

export default function Portafolio() {
  const portfolio = useStore(s => s.portfolio);
  const addPortfolio = useStore(s => s.addPortfolio);
  const removePortfolio = useStore(s => s.removePortfolio);
  const [busy, setBusy] = useState<'camera' | 'gallery' | null>(null);

  const add = async (source: 'camera' | 'gallery') => {
    const uri = await pickImage(source);
    if (!uri) return;
    setBusy(source);
    try {
      await addPortfolio(uri);
    } catch (e) {
      Alert.alert('No pudimos subir la foto', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = (id: string) =>
    Alert.alert('Eliminar foto', '¿Quieres quitar esta foto de tu portafolio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await removePortfolio(id);
          } catch (e) {
            Alert.alert('No pudimos eliminar la foto', errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen>
      <FadeIn>
        <View style={styles.introRow}>
          <Text style={styles.intro}>Tu vitrina digital. Tus clientas ven estas fotos en la pantalla de inicio.</Text>
          <FloatingIcon name="sparkles-outline" size={22} color={colors.gold} amplitude={5} />
        </View>
      </FadeIn>
      <View style={styles.actions}>
        <Button title="Tomar foto" icon="camera-outline" style={styles.flex} loading={busy === 'camera'} disabled={busy !== null} onPress={() => void add('camera')} />
        <Button title="Galería" icon="images-outline" variant="secondary" style={styles.flex} loading={busy === 'gallery'} disabled={busy !== null} onPress={() => void add('gallery')} />
      </View>
      {portfolio.length === 0 ? (
        <Card>
          <EmptyState icon="images-outline" title="Aún no tienes fotos" text="Toma una foto de tu último diseño o súbela desde la galería." />
        </Card>
      ) : (
        <>
          <View style={styles.grid}>
            {portfolio.map((p, index) => (
              <StaggerItem key={p.id} index={index} style={styles.itemWrapper}>
                <View style={styles.item}>
                  <ZoomImage uri={p.uri} style={styles.image} accessibilityLabel={`Foto del ${shortDate(p.date)}`} />
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{shortDate(p.date)}</Text>
                  </View>
                  <Pressable onPress={() => remove(p.id)} style={styles.removeButton} accessibilityRole="button" accessibilityLabel="Eliminar foto" hitSlop={8}>
                    <FloatingIcon name="trash-outline" size={14} color={colors.danger} amplitude={2} />
                  </Pressable>
                </View>
              </StaggerItem>
            ))}
          </View>
          <Text style={styles.hint}>Doble toque o pellizca para ampliar · Usa el ícono para eliminar</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  intro: { flex: 1, fontSize: 14, color: colors.muted, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginVertical: 18 },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  itemWrapper: { width: '48%', marginBottom: 12 },
  item: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.soft },
  image: { width: '100%', height: '100%' },
  tag: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  tagText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  removeButton: { position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6 },
});
