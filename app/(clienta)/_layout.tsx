import { Tabs } from 'expo-router';
import { tabIcon } from '../../components/ui';
import { tabScreenOptions } from '../../constants/theme';

export default function ClientaLayout() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="inicio" options={{ title: 'Inicio', headerShown: false, tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="citas" options={{ title: 'Mis citas', tabBarIcon: tabIcon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="ubicacion" options={{ title: 'Ubicación', tabBarIcon: tabIcon('location-outline', 'location') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Mi perfil', tabBarIcon: tabIcon('person-outline', 'person') }} />
    </Tabs>
  );
}
