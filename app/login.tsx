import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { z } from 'zod';
import { FadeIn, PopIn } from '../components/animation';
import { Button, Card, Input, Segmented } from '../components/ui';
import { colors, gradients, radius, shadow } from '../constants/theme';
import { errorMessage } from '../lib/errors';
import { useStore } from '../lib/store';
import { isSupabaseConfigured } from '../lib/supabase';

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres'),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(3, 'Ingresa tu nombre completo'),
  phone: z.string().trim().regex(/^3\d{9}$/, 'Ingresa un celular válido de 10 dígitos'),
});

type Field = 'email' | 'password' | 'name' | 'phone' | 'form';
type Errors = Partial<Record<Field, string>>;

const toErrors = (issues: { path: PropertyKey[]; message: string }[]) => {
  const e: Errors = {};
  issues.forEach(i => {
    const k = String(i.path[0]) as Field;
    if (!e[k]) e[k] = i.message;
  });
  return e;
};

export default function Login() {
  const signIn = useStore(s => s.signIn);
  const signUp = useStore(s => s.signUp);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const goHome = () => {
    const state = useStore.getState();
    const role = state.session?.role;
    router.replace(role === 'manicurista' ? (state.business.configured ? '/agenda' : '/onboarding') : '/inicio');
  };

  const submit = async () => {
    if (busy) return;
    setErrors({});

    if (mode === 'login') {
      const r = loginSchema.safeParse({ email, password });
      if (!r.success) return setErrors(toErrors(r.error.issues));
      setBusy(true);
      try {
        await signIn(r.data.email, r.data.password);
        goHome();
      } catch (e) {
        setErrors({ form: errorMessage(e) });
      } finally {
        setBusy(false);
      }
      return;
    }

    const r = registerSchema.safeParse({ email, password, name, phone });
    if (!r.success) return setErrors(toErrors(r.error.issues));
    setBusy(true);
    try {
      const result = await signUp({
        name: r.data.name,
        phone: r.data.phone,
        email: r.data.email,
        password: r.data.password,
      });
      if (result.needsConfirmation) {
        setSentTo(r.data.email);
        setPassword('');
      } else {
        goHome();
      }
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const backToLogin = () => {
    setSentTo(null);
    setMode('login');
    setErrors({});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.blobTop} />
      <View style={styles.blobSide} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn style={styles.hero} delay={40}>
            <PopIn delay={120}>
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
                <Ionicons name="color-palette" size={36} color={colors.white} />
              </LinearGradient>
            </PopIn>
            <Text style={styles.brand}>NailTime</Text>
            <Text style={styles.tagline}>Tu agenda de uñas, siempre en orden</Text>
          </FadeIn>

          {!isSupabaseConfigured ? (
            <Card style={styles.warning}>
              <Ionicons name="warning-outline" size={22} color={colors.warning} />
              <Text style={styles.warningText}>
                Falta conectar Supabase. Crea un archivo `.env` con tu URL y tu clave pública, y reinicia la app.
              </Text>
            </Card>
          ) : null}

          <Card style={styles.card}>
            {sentTo ? (
              <View style={styles.sent}>
                <View style={styles.sentIcon}>
                  <Ionicons name="mail-unread-outline" size={34} color={colors.primary} />
                </View>
                <Text style={styles.sentTitle}>Revisa tu correo</Text>
                <Text style={styles.sentText}>
                  Enviamos un enlace de confirmación a {sentTo}. Ábrelo para activar tu cuenta y luego inicia sesión.
                </Text>
                <Button title="Ya confirmé mi correo" icon="log-in-outline" onPress={backToLogin} />
                <Pressable onPress={() => setSentTo(null)} hitSlop={8} style={{ marginTop: 14 }}>
                  <Text style={styles.link}>Usar otro correo</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Segmented
                  value={mode}
                  onChange={m => {
                    setMode(m);
                    setErrors({});
                  }}
                  options={[
                    { value: 'login', label: 'Ingresar' },
                    { value: 'register', label: 'Crear cuenta' },
                  ]}
                />

                {mode === 'register' ? (
                  <>
                    <Input label="Nombre completo" icon="person-outline" placeholder="Tu nombre" value={name} onChangeText={setName} error={errors.name} autoComplete="name" />
                    <Input label="Celular" icon="call-outline" placeholder="3001234567" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} error={errors.phone} />
                  </>
                ) : null}

                <Input
                  label="Correo"
                  icon="mail-outline"
                  placeholder="tucorreo@ejemplo.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                />
                <Input
                  label="Contraseña"
                  icon="lock-closed-outline"
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                />

                {mode === 'login' ? (
                  <Pressable onPress={() => router.push('/recuperar')} hitSlop={8} style={styles.forgot}>
                    <Text style={styles.link}>Olvidé mi contraseña</Text>
                  </Pressable>
                ) : null}

                {errors.form ? (
                  <View style={styles.formError}>
                    <Ionicons name="alert-circle" size={18} color={colors.danger} />
                    <Text style={styles.formErrorText}>{errors.form}</Text>
                  </View>
                ) : null}

                <Button
                  title={mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
                  loading={busy}
                  onPress={submit}
                  style={{ marginTop: mode === 'login' ? 6 : 4 }}
                />
              </>
            )}
          </Card>

          {mode === 'register' && !sentTo ? (
            <Text style={styles.note}>
              La primera cuenta que confirma su correo queda a cargo del estudio. Las siguientes se unen como clientas.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  blobTop: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: colors.soft, top: -140, right: -90 },
  blobSide: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.goldSoft, top: 120, left: -110 },
  content: { padding: 22, paddingBottom: 40 },
  hero: { alignItems: 'center', marginTop: 24, marginBottom: 26 },
  logo: { width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], ...shadow },
  brand: { fontSize: 34, fontWeight: '900', color: colors.primaryDark, marginTop: 16, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: colors.muted, marginTop: 4 },
  card: { padding: 20 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16, backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  warningText: { flex: 1, fontSize: 13, color: colors.warning, lineHeight: 19, fontWeight: '600' },
  forgot: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -4 },
  link: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  formError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: radius.sm, marginBottom: 14 },
  formErrorText: { color: colors.danger, fontWeight: '600', flex: 1 },
  note: { fontSize: 12.5, color: colors.muted, textAlign: 'center', marginTop: 18, lineHeight: 18, paddingHorizontal: 8 },
  sent: { alignItems: 'center', paddingVertical: 8 },
  sentIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sentTitle: { fontSize: 21, fontWeight: '900', color: colors.text },
  sentText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 22 },
});
