import { useState } from 'react';
import { StyleSheet, Switch, Text } from 'react-native';
import { router } from 'expo-router';
import { ServiceCard } from '../../components/ServiceCard';
import { Button, Card, EmptyState, Screen } from '../../components/ui';
import { colors } from '../../constants/theme';
import { errorMessage } from '../../lib/errors';
import { useStore } from '../../lib/store';
import { Alert } from '../../lib/alert';

export default function Servicios() {
  const services = useStore(s => s.services);
  const toggleService = useStore(s => s.toggleService);
  const [busyId, setBusyId] = useState<string | null>(null);
  const activeCount = services.filter(s => s.active).length;

  const toggle = async (id: string) => {
    setBusyId(id);
    try {
      await toggleService(id);
    } catch (e) {
      Alert.alert('No pudimos actualizar el servicio', errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Button title="Nuevo servicio" icon="add-circle-outline" onPress={() => router.push('/servicio')} />
      <Text style={styles.hint}>
        {activeCount} de {services.length} servicios visibles para tus clientas
      </Text>
      {services.length === 0 ? (
        <Card>
          <EmptyState icon="pricetags-outline" title="Aún no tienes servicios" text="Crea tu primer servicio con precio y duración para empezar a recibir reservas." />
        </Card>
      ) : (
        services.map(s => (
          <ServiceCard
            key={s.id}
            service={s}
            dimmed={!s.active}
            onPress={() => router.push({ pathname: '/servicio', params: { id: s.id } })}
            right={
              <Switch
                value={s.active}
                disabled={busyId === s.id}
                onValueChange={() => void toggle(s.id)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            }
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.muted, textAlign: 'center', marginVertical: 16 },
});
