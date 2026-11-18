import { Redirect } from 'expo-router';
import { useStore } from '../lib/store';

export default function Index() {
  const ready = useStore(s => s.ready);
  const session = useStore(s => s.session);
  const configured = useStore(s => s.business.configured);

  if (!ready) return null;
  if (!session) return <Redirect href="/login" />;
  if (session.role === 'manicurista') return <Redirect href={configured ? '/agenda' : '/onboarding'} />;
  return <Redirect href="/inicio" />;
}
