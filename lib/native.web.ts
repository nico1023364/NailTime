import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Alert } from './alert';

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
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Ubicación', 'Activa el permiso de ubicación para usar esta opción.');
      return null;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Abre el selector de archivos del navegador y devuelve la imagen como data URL. */
export function pickImage(_source: 'camera' | 'gallery'): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      const reader = new FileReader();
      reader.onload = () => done(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => done(null);
      reader.readAsDataURL(file);
    });
    input.addEventListener('cancel', () => done(null));

    input.click();
  });
}

export function askImage(_title = 'Agregar foto'): Promise<string | null> {
  // En el navegador el selector del sistema ya ofrece cámara o galería.
  return pickImage('gallery');
}
