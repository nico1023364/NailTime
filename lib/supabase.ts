import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

/** `true` cuando `.env` tiene la URL y la clave pública del proyecto. */
export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(
  // El cliente necesita una URL válida incluso sin configurar; las acciones
  // comprueban `isSupabaseConfigured` antes de usarlo y muestran un aviso.
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? key : 'public-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // En web Supabase procesa el enlace de recuperación/confirmación solo.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
    realtime: { params: { eventsPerSecond: 4 } },
  }
);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Falta configurar Supabase. Agrega EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en tu .env y reinicia la app.');
  }
}
