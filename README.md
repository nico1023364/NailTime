# NailTime

Aplicación de agenda y reservas para **un estudio de uñas**, construida con **Expo SDK 58**, **React Native**, **Expo Router** y **Supabase**. Funciona en Android, iOS y web.

El proyecto está pensado para producción: autenticación real con correo y contraseña, tablas independientes con RLS, fotos en Supabase Storage y sin datos de demostración.

## Modelo de uso

- **Un solo estudio por despliegue.** No es un marketplace de varios negocios.
- La **primera cuenta que confirma su correo** queda como **manicurista dueña** del estudio.
- Las cuentas siguientes se registran como **clientas**.
- Solo la dueña puede editar el negocio, servicios, horario, fotos y el estado de las citas.
- El cambio de dueña se hace por SQL (ver [Cambiar de dueña](#cambiar-de-dueña)).

## Lo que incluye

**Experiencia clienta**

- Inicio con perfil del negocio, contacto directo (WhatsApp y llamada), servicios por categoría, portafolio y próxima cita.
- Reserva con calendario, horarios según la duración del servicio, modalidad estudio/domicilio, dirección y foto de referencia.
- Mis citas, historial, detalle, reprogramación y cancelación.
- Ubicación del estudio con mapa, horario de atención y estado abierto/cerrado.
- Perfil editable, cambio de contraseña y recordatorios locales (24 h y 2 h antes).

**Experiencia manicurista**

- Agenda diaria con calendario, ingresos del día y reservas por confirmar.
- Servicios con precio, duración, categoría, foto y visibilidad.
- Horario semanal, descanso y bloqueo de fechas.
- Portafolio de diseños en Storage.
- Configuración del negocio, ubicación y servicio a domicilio.

**Producto**

- Diseño rosa/ciruela con gradientes, tarjetas suaves y tipografía consistente.
- Animaciones sutiles con `Animated`: entrada de pantallas, rebote del logo y del check de confirmación, feedback al presionar botones, tarjetas y chips.
- Solo iconos vectoriales (Ionicons), sin emojis.
- Assets de marca reproducibles con `scripts/generate-assets.ps1`.
- Validaciones con Zod, mensajes de error en español y estados de carga.
- Actualización en tiempo real entre dispositivos con Supabase Realtime.

## Requisitos

- Node.js 22.13+ (lo exige Expo SDK 58).
- Expo Go para **SDK 58** o un emulador Android/iOS.
- Un proyecto de **Supabase** (necesario para iniciar sesión y guardar datos).

> Si Expo Go muestra “Project is incompatible with this version of Expo Go”, había un Metro abierto antes de actualizar el SDK. Detenlo con `Ctrl+C` y arranca con `npx expo start -c`.

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y ejecuta completo el archivo [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   - Si el editor da un error de *dollar-quoted string*, usa los 4 bloques de [`supabase/steps/`](supabase/steps/) en orden (`01_…`, `02_…`, `03_…`, `04_…`). Son el mismo SQL dividido en trozos más pequeños; ejecútalos uno por uno.
   - Si el proyecto ya tenía cuentas en Authentication, descomenta el bloque **“Cuentas creadas antes de esta migración”** al final del archivo (o del paso 4) y ejecútalo también: crea los perfiles que faltan y elige a la dueña.
   - Borra las cuentas de demostración (`valentina@nailtime.co`, `laura@correo.com`) en **Authentication → Users**.
3. Ve a **Project Settings → Data API** y copia la **Project URL**.
4. Ve a **Project Settings → API Keys** y copia la **Publishable key** (`sb_publishable_...`). En proyectos antiguos usa la **anon public** (`eyJ...`).

La migración crea:

- Perfiles, negocio, servicios, horario semanal, fechas bloqueadas, citas y portafolio.
- RLS por usuario y por dueña; la primera cuenta que confirma su correo queda como dueña del estudio.
- Restricciones de integridad: el precio y la duración salen del catálogo; dos citas no pueden ocupar el mismo horario.
- Buckets de Storage `portfolio` (público) y `references` (privado).
- Publicación de Realtime para las tablas.
- Eliminación de la tabla demo `nailtime_state`.

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Completa:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Opcional, solo para builds instalables
GOOGLE_MAPS_API_KEY=
```

- Nunca uses la `service_role` ni una `secret key` (`sb_secret_...`) en la app: se saltan RLS.
- Las variables `EXPO_PUBLIC_*` se incrustan al compilar. Reinicia Metro con `npx expo start -c` después de cambiarlas.

### 4. Configurar Authentication en Supabase

En **Authentication → Providers → Email**:

- Deja activada la **confirmación de correo**.
- Para producción configura **SMTP propio** en **Authentication → SMTP**. El servicio de correo de prueba de Supabase tiene límites muy bajos.

En **Authentication → URL Configuration**:

- **Site URL:** si todavía no tienes dominio, deja `http://localhost:3000` (el valor inicial). No es necesario cambiarlo para generar el APK. Cuando publiques la web, reemplázalo por `https://tu-dominio.com`.
- **Redirect URLs:** agrega una por línea:
  - `http://localhost:3000/**`
  - `http://localhost:8081/**`
  - `nailtime://**`
  - `https://tu-dominio.com/**` (solo cuando tengas la web publicada)

Estas URLs son necesarias para la confirmación de cuenta y la recuperación de contraseña. `nailtime://` viene de `expo.scheme` en `app.json` y es la que usa la app instalada (APK). `localhost:8081` es la web exportada servida desde `dist/`. Para producción con APK no necesitas comprar un dominio.

### 5. Arrancar

```bash
npx expo start
```

Escanea el QR con Expo Go o pulsa `a` / `w` para Android / web.

### 6. Crear la cuenta de la dueña

1. Abre la app y elige **Crear cuenta**.
2. Registra el correo de la dueña del estudio.
3. Confirma el correo desde el enlace recibido.
4. Inicia sesión: la app te llevará al **onboarding** para configurar el negocio.

> **La primera cuenta que confirma el correo se convierte en la dueña.** Un registro sin confirmar no ocupa el rol, así que un correo mal escrito no bloquea la configuración. Si más adelante necesitas otra dueña, usa el SQL de [Cambiar de dueña](#cambiar-de-dueña). Las cuentas posteriores serán clientas.

### Pruebas opcionales con cuentas temporales

Para probar ambos roles en Expo Go o en el APK sin depender de correos, ejecuta `supabase/test-accounts.sql` en **SQL Editor → New query → Run**. Crea dos cuentas confirmadas:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Dueña / administradora | `duena.prueba@nailtime.app` | `Prueba123!` |
| Clienta | `clienta.prueba@nailtime.app` | `Prueba123!` |

El script no crea servicios, citas ni fotos de demostración. Si ya existía una manicurista real, le quita el rol temporalmente y lo asigna a la dueña de prueba. **No las dejes en producción:** al terminar ejecuta `supabase/test-accounts-cleanup.sql`.

## Cambiar de dueña

Ejecuta esto en **SQL Editor** con el correo de la nueva dueña:

```sql
update public.profiles set role = 'clienta' where role = 'manicurista';

update public.profiles
set role = 'manicurista'
where id = (select id from auth.users where email = 'nueva-duena@correo.com');

update public.business
set owner_id = (select id from auth.users where email = 'nueva-duena@correo.com')
where id = 1;
```

El rol nunca se puede cambiar desde la app.

## Datos y seguridad

- **Autenticación:** Supabase Auth con correo y contraseña, confirmación de correo y recuperación por enlace.
- **Contraseñas:** nunca se guardan en la base de datos ni en el dispositivo.
- **RLS:** cada clienta solo ve sus citas; la dueña ve todas. Las escrituras del negocio, servicios, horario y portafolio están limitadas a la dueña.
- **Precios y duración:** el servidor los copia del catálogo al crear o editar una cita. La clienta no puede alterarlos ni auto-confirmarse una cita.
- **Solapamientos:** una restricción de exclusión impide dos citas activas en el mismo horario.
- **Storage:**
  - `portfolio` es público (fotos de servicios y portafolio).
  - `references` es privado; las fotos se muestran con URLs firmadas y solo las ve la clienta o la dueña.

### Tablas principales

| Tabla | Contenido |
| --- | --- |
| `profiles` | Cuentas con rol, nombre y celular |
| `business` | Fila única con la información del estudio |
| `business_hours` | Horario por día de la semana |
| `blocked_dates` | Fechas sin atención |
| `services` | Catálogo de servicios |
| `appointments` | Citas con estado y datos de contacto |
| `portfolio_items` | Referencias a fotos del portafolio |

## Scripts

```bash
npm start            # servidor de desarrollo
npm run android      # abre Android
npm run ios          # abre iOS (macOS)
npm run web          # abre la versión web
npm run lint         # ESLint
npx tsc --noEmit     # verificación de tipos
npx expo-doctor      # diagnóstico de dependencias y configuración
npx expo export --platform web      # build estático web en dist/
npx expo export --platform android  # bundle JS de Android
```

## Mapas

- **Android/iOS:** `react-native-maps` (Google Maps en Android, Apple Maps en iOS). En Expo Go funciona sin configuración.
- **Web:** mapa embebido de **OpenStreetMap**, sin API key.
- Si un mapa no carga, la app muestra un respaldo con la dirección, las coordenadas y botones para abrir Google Maps.
- **Builds instalables:** Google Maps necesita una API key con **Maps SDK for Android** y **Maps SDK for iOS**. Agrégala como `GOOGLE_MAPS_API_KEY`; `app.config.js` la inyecta con el plugin oficial y nunca se sube a git.

## Deep links y correos

- En **web**, Supabase procesa el enlace de confirmación/recuperación automáticamente.
- En **Android/iOS**, el enlace abre la app con el esquema `nailtime://`. Para que funcione en un dispositivo real necesitas un **development build** o la app instalada; en Expo Go los deep links del correo no son fiables porque la URL depende del servidor de desarrollo.
- La recuperación de contraseña debe abrirse en el mismo dispositivo donde se solicitó.

## Notificaciones y calendario

- Los recordatorios son **notificaciones locales**: el dispositivo debe haber iniciado sesión al menos una vez y tener permiso de notificaciones.
- En **Expo Go para Android** las notificaciones no están disponibles.
- `expo-calendar` dejó de incluirse en Expo Go desde SDK 58. “Agregar al calendario” funciona en un development build o en la app instalada; en web tampoco está disponible.

## Build de producción

### APK instalable (sin Play Store)

```bash
npx eas-cli@latest whoami
# Si no hay sesión:
npx eas-cli@latest login

npx eas-cli@latest build --platform android --profile apk
```

El perfil `apk` de `eas.json` genera un `.apk` (`android.buildType: "apk"`) que se instala directamente en el celular. Las variables públicas de Supabase ya están declaradas en `eas.json`, porque `.env` no se sube a EAS. Si cambias de proyecto de Supabase, actualiza esos valores en `eas.json` o configúralos como Environment Variables en EAS.

> El plugin `expo-build-properties` agrega dos reglas ProGuard en `app.json`. Son necesarias con Expo SDK 58 + `react-native-maps`: R8 elimina los constructores que WorkManager/Room crean por reflexión y, sin esas reglas, el APK instala pero se cierra antes de mostrar la primera pantalla. No las elimines.

Al terminar, el CLI muestra una URL de descarga: ábrela en el celular o descarga el `.apk` y usa `adb install archivo.apk`. Puedes consultar el estado con `npx eas-cli@latest build:list --limit 1`.

### Google Maps en el APK

La app usa `react-native-maps` en Android. Para que el mapa cargue, crea una API key de Google con **Maps SDK for Android** habilitado y agrégala como variable `GOOGLE_MAPS_API_KEY` en EAS (o en `eas.json`). Sin clave, la app muestra el respaldo con dirección, coordenadas y botones para abrir Google Maps.

### Play Store (AAB)

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --profile production
```

El perfil `production` genera `.aab`, el formato que exige Google Play. Necesitas una cuenta de Google Play Console.

### iOS

```bash
npx eas-cli@latest build --platform ios --profile production
```

Requiere cuenta de Apple Developer.

### Web

```bash
npx expo export --platform web
```

El resultado queda en `dist/` (configuración `web.output: "single"`). Publícalo en tu hosting y agrega la URL a **Site URL** y **Redirect URLs** de Supabase.

## Estructura

```text
app/                   rutas de Expo Router
  (clienta)/           pestañas de la clienta
  (pro)/               pestañas de la manicurista
  reservar/[id].tsx    flujo de reserva
  cita/[id].tsx        detalle de la cita
components/
  ui.tsx               componentes base (botones, tarjetas, chips, pantallas)
  animation.tsx        animaciones con Animated de React Native
constants/theme.ts     colores, radios, sombras y estilos de tabs
lib/
  store.ts             estado Zustand respaldado por Supabase
  supabase.ts          cliente de Supabase
  authLinks.ts         enlaces de confirmación y recuperación
  storage.ts           subida y URLs de imágenes
  reminders.ts         notificaciones locales
  errors.ts            traducción de errores
eas.json               perfiles de build (apk instalable y production AAB)
supabase/migrations/   esquema SQL de producción
scripts/               generación de assets con GDI+
assets/                iconos, splash y favicon
```

## Regenerar los iconos

```bash
powershell -ExecutionPolicy Bypass -File scripts/generate-assets.ps1
```

## Licencia

MIT. Ver [`LICENSE`](LICENSE).
