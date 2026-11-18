type MaybeError = {
  code?: string | null;
  message?: string | null;
  error_description?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number;
};

/** Traduce errores de Supabase/Postgres a mensajes claros en español. */
export function errorMessage(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado.';
  const e = error as MaybeError;
  const code = e.code ?? '';
  const raw = `${e.message ?? e.error_description ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`.trim();

  if (code === '23P01' || /exclusion constraint|conflicting key|overlap/i.test(raw)) {
    return 'Ese horario acaba de ocuparse. Elige otro, por favor.';
  }
  if (code === '42501' || /row-level security|permission denied|not allowed/i.test(raw)) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (code === '23505' || /duplicate key|already registered|already exists/i.test(raw)) {
    return 'Ya existe un registro con estos datos.';
  }
  if (/invalid login credentials/i.test(raw)) return 'Correo o contraseña incorrectos.';
  if (/relation .* does not exist|could not find the table|schema cache/i.test(raw)) {
    return 'La base de datos aún no está configurada. Ejecuta la migración de Supabase y vuelve a intentarlo.';
  }
  if (/bucket.*not found|bucket not found/i.test(raw)) {
    return 'Las fotos aún no están configuradas. Ejecuta la migración de Supabase.';
  }
  if (/email not confirmed/i.test(raw)) return 'Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.';
  if (/user already registered|already been registered/i.test(raw)) return 'Ya existe una cuenta con este correo.';
  if (/password should be at least|weak password/i.test(raw)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/same password/i.test(raw)) return 'La nueva contraseña debe ser diferente a la anterior.';
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(raw)) {
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  }
  if (/auth session missing|jwt expired|refresh token/i.test(raw)) {
    return 'Tu sesión venció. Vuelve a iniciar sesión.';
  }
  if (/network|failed to fetch|fetch failed|timeout|timed out/i.test(raw)) {
    return 'No pudimos conectar. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  if (/service.*no.*disponible|ya no está disponible/i.test(raw)) return 'Ese servicio ya no está disponible.';
  if (/fecha pasada/i.test(raw)) return 'No puedes reservar en una fecha pasada.';
  if (/estado de cita no permitido/i.test(raw)) return 'No puedes cambiar la cita a ese estado.';

  return e.message || e.error_description || 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

/** `true` si el error es un choque de horarios (restricción de exclusión). */
export function isOverlapError(error: unknown): boolean {
  const e = error as MaybeError;
  return e?.code === '23P01' || /exclusion constraint|conflicting key|overlap/i.test(e?.message ?? '');
}
