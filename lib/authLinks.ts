import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/** URL a la que Supabase devuelve a la persona después de un enlace por correo. */
export function recoveryRedirect() {
  if (Platform.OS === 'web') {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
    return `${origin}/nueva-contrasena`;
  }
  return Linking.createURL('/nueva-contrasena');
}

/** URL de retorno al confirmar el correo de una cuenta nueva. */
export function confirmRedirect() {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  }
  return Linking.createURL('/');
}

const consumed = new Set<string>();

function paramsFromUrl(url: string) {
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  const hash = url.split('#')[1] ?? '';
  return new URLSearchParams(`${query}&${hash}`);
}

/**
 * En móvil, procesa a mano el enlace profundo del correo (recuperación o
 * confirmación): canjea el `code` PKCE o instala los tokens del fragmento.
 * En web lo hace supabase-js automáticamente con `detectSessionInUrl`.
 */
export async function consumeAuthUrl(url: string | null | undefined): Promise<boolean> {
  if (!url || Platform.OS === 'web') return false;
  const params = paramsFromUrl(url);
  const errorDescription = params.get('error_description') || params.get('error');
  if (errorDescription) throw new Error(errorDescription);

  const code = params.get('code');
  if (code) {
    if (consumed.has(code)) return true;
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      if (/code verifier|flow state/i.test(error.message)) {
        throw new Error('Abre este enlace en el mismo dispositivo donde lo solicitaste.');
      }
      throw error;
    }
    consumed.add(code);
    return true;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return true;
  }

  return false;
}

/** Primer enlace que abrió la app (o `null`). */
export async function initialAuthUrl() {
  try {
    return await Linking.getInitialURL();
  } catch {
    return null;
  }
}
