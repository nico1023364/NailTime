import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { AppointmentCard } from '../../components/AppointmentCard';
import { Button, Card, EmptyState, Screen, Segmented } from '../../components/ui';
import { compareAppointments, friendlyDate, isUpcoming } from '../../lib/format';
import { useStore } from '../../lib/store';

export default function Citas() {
  const session = useStore(s => s.session);
  const appointments = useStore(s => s.appointments);
  const business = useStore(s => s.business);
  const [tab, setTab] = useState<'proximas' | 'historial'>('proximas');

  const { upcoming, past } = useMemo(() => {
    const mine = appointments.filter(a => a.clientId === session?.id);
    return {
      upcoming: mine.filter(isUpcoming).sort(compareAppointments),
      past: mine.filter(a => !isUpcoming(a)).sort((a, b) => compareAppointments(b, a)),
    };
  }, [appointments, session?.id]);

  const list = tab === 'proximas' ? upcoming : past;

  return (
    <Screen>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'proximas', label: `Próximas (${upcoming.length})` },
          { value: 'historial', label: 'Historial' },
        ]}
      />
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === 'proximas' ? 'calendar-outline' : 'time-outline'}
            title={tab === 'proximas' ? 'No tienes citas próximas' : 'Aún no tienes historial'}
            text={tab === 'proximas' ? 'Elige un servicio y reserva en pocos pasos.' : 'Aquí verás tus citas pasadas y canceladas.'}
            action={tab === 'proximas' ? <Button title="Reservar ahora" icon="sparkles-outline" onPress={() => router.navigate('/inicio')} /> : undefined}
          />
        </Card>
      ) : (
        list.map(a => (
          <AppointmentCard key={a.id} appointment={a} subtitle={`${friendlyDate(a.date)} · ${business.name}`} onPress={() => router.push(`/cita/${a.id}`)} />
        ))
      )}
    </Screen>
  );
}
