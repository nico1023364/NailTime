import { Tabs } from 'expo-router';
import { tabIcon } from '../../components/ui';
import { tabScreenOptions } from '../../constants/theme';

export default function ProLayout() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', headerShown: false, tabBarIcon: tabIcon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="servicios" options={{ title: 'Servicios', headerTitle: 'Mis servicios', tabBarIcon: tabIcon('pricetags-outline', 'pricetags') }} />
      <Tabs.Screen name="horario" options={{ title: 'Horario', headerTitle: 'Mi horario', tabBarIcon: tabIcon('time-outline', 'time') }} />
      <Tabs.Screen name="portafolio" options={{ title: 'Portafolio', headerTitle: 'Mi portafolio', tabBarIcon: tabIcon('images-outline', 'images') }} />
      <Tabs.Screen name="negocio" options={{ title: 'Negocio', headerTitle: 'Mi negocio', tabBarIcon: tabIcon('storefront-outline', 'storefront') }} />
    </Tabs>
  );
}
