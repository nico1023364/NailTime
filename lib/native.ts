import { Alert } from './alert';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';

export { addToCalendar, calendarAvailable, type CalendarResult } from './calendar';

const digits = (p: string) => p.replace(/\D/g, '');

const open = (url: string, error: string) => {
  Linking.openURL(url).catch(() => Alert.alert('Ups', error));
};

export const call = (phone: string) => open(`tel:${digits(phone)}`, 'No fue posible iniciar la llamada.');

export const whatsapp = (phone: string, text = '') => {
  const n = digits(phone);
  const full = n.length === 10 ? `57${n}` : n;
  open(`https://wa.me/${full}?text=${encodeURIComponent(text)}`, 'No fue posible abrir WhatsApp.');
};

export const openRoute = (lat: number, lng: number) =>
  open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, 'No fue posible abrir el mapa.');

export const openSearch = (query: string) =>
  open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, 'No fue posible abrir el mapa.');

export async function currentLocation() {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Ubicación', 'Activa el permiso de ubicación para usar esta opción.');
    return null;
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = pos.coords;
  let address: string | undefined;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (place) {
      const street = place.street ? `${place.street}${place.streetNumber ? ' ' + place.streetNumber : ''}` : place.name;
      address = [street, place.district ?? place.subregion, place.city].filter(Boolean).join(', ');
    }
  } catch {}
  return { latitude, longitude, address };
}

export async function pickImage(source: 'camera' | 'gallery') {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permiso requerido',
      source === 'camera' ? 'Permite el acceso a la cámara para tomar la foto.' : 'Permite el acceso a tus fotos para elegir una imagen.'
    );
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
  try {
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  } catch {
    Alert.alert('Ups', 'No fue posible abrir la cámara en este dispositivo.');
    return null;
  }
}

export function askImage(title = 'Agregar foto'): Promise<string | null> {
  return new Promise(resolve => {
    Alert.alert(
      title,
      'Elige de dónde quieres tomar la imagen',
      [
        { text: 'Cámara', onPress: () => pickImage('camera').then(resolve) },
        { text: 'Galería', onPress: () => pickImage('gallery').then(resolve) },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}


