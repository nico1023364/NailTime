import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Input } from './ui';
import { colors } from '../constants/theme';
import { errorMessage } from '../lib/errors';
import { useStore } from '../lib/store';
import { Alert } from '../lib/alert';

export function PasswordForm() {
  const updatePassword = useStore(s => s.updatePassword);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (password.length < 6) {
      Alert.alert('Contraseña', 'Usa al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Contraseña', 'Las dos contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirm('');
      Alert.alert('Listo', 'Tu contraseña fue actualizada.');
    } catch (e) {
      Alert.alert('No pudimos cambiar la contraseña', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 14 }}>
        Usa una contraseña segura que no compartas con nadie.
      </Text>
      <Input label="Nueva contraseña" icon="lock-closed-outline" secureTextEntry value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" />
      <Input label="Repetir contraseña" icon="lock-closed-outline" secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="Repite tu contraseña" />
      <Button title="Actualizar contraseña" icon="shield-checkmark-outline" variant="secondary" loading={saving} onPress={save} />
    </>
  );
}
