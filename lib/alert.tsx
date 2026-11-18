import { useEffect, useState } from 'react';
import { Alert as NativeAlert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';
import { PopIn } from '../components/animation';

/**
 * `Alert.alert` compatibleo entre plataformas.
 *
 * En Android/iOS delega en el diálogo nativo de React Native. En web,
 * `react-native-web` implementa `Alert.alert` como una función vacía, así que
 * aquí mostramos un diálogo propio montado desde `DialogHost`.
 */
export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface DialogState {
  title: string;
  message?: string;
  buttons: AlertButton[];
  cancelable: boolean;
  onDismiss?: () => void;
}

let current: DialogState | null = null;
let notify: ((dialog: DialogState | null) => void) | null = null;

function publish() {
  notify?.(current);
}

function close(button?: AlertButton) {
  const dialog = current;
  if (!dialog) return;
  current = null;
  publish();
  if (button) button.onPress?.();
  else dialog.onDismiss?.();
}

function open(dialog: DialogState) {
  current = dialog;
  publish();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (Platform.OS !== 'web') {
      NativeAlert.alert(title, message, buttons, options);
      return;
    }

    open({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'Entendido' }],
      cancelable: options?.cancelable ?? true,
      onDismiss: options?.onDismiss,
    });
  },
};

/** Se monta una sola vez en el layout raíz. */
export function DialogHost() {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    notify = setDialog;
    setDialog(current);
    return () => {
      if (notify === setDialog) notify = null;
    };
  }, []);

  if (!dialog) return null;

  const dismiss = () => {
    if (dialog.cancelable) close();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <PopIn trigger={`${dialog.title}|${dialog.message ?? ''}`}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{dialog.title}</Text>
            {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
            <View style={styles.actions}>
              {dialog.buttons.map((button, index) => (
                <Pressable
                  key={`${button.text ?? 'accion'}-${index}`}
                  accessibilityRole="button"
                  onPress={() => close(button)}
                  style={({ pressed }) => [
                    styles.button,
                    button.style === 'cancel' && styles.buttonCancel,
                    button.style === 'destructive' && styles.buttonDanger,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'cancel' && styles.cancelText,
                      button.style === 'destructive' && styles.dangerText,
                    ]}
                  >
                    {button.text ?? 'Aceptar'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </PopIn>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 22,
    gap: 10,
    ...shadow,
  },
  title: { fontSize: 18, fontWeight: '900', color: colors.text },
  message: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  actions: { gap: 8, marginTop: 8 },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buttonCancel: { backgroundColor: colors.soft },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonText: { fontSize: 15, fontWeight: '800', color: colors.white },
  cancelText: { color: colors.primaryDark },
  dangerText: { color: colors.danger },
  pressed: { opacity: 0.85 },
});
