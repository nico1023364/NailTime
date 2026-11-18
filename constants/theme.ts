export const colors = {
  primary: '#E2568B',
  primaryDark: '#A83261',
  primaryLight: '#F7A8C4',
  soft: '#FCE7F0',
  softer: '#FFF5F9',
  background: '#FFF9FB',
  surface: '#FDF1F6',
  card: '#FFFFFF',
  text: '#2E2028',
  muted: '#8C7682',
  border: '#F2DCE6',
  gold: '#9A7350',
  goldSoft: '#F7EEE4',
  success: '#2F9E74',
  successSoft: '#E1F4EC',
  warning: '#B7791F',
  warningSoft: '#FBF1DD',
  danger: '#D1495B',
  dangerSoft: '#FCE6E9',
  white: '#FFFFFF',
  overlay: 'rgba(46, 32, 40, 0.45)',
  shadow: '#8A3358',
};

export const gradients = {
  brand: ['#F0789F', '#D94C82', '#A83261'] as const,
  brandSoft: ['#FFF5F9', '#FCE7F0'] as const,
  gold: ['#B98A60', '#8A6242'] as const,
};

export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 30, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36 };

export const layout = {
  maxWidth: 720,
  screenPadding: 20,
  tabBar: 62,
};

export const shadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};

export const softShadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const calendarTheme = {
  backgroundColor: 'transparent',
  calendarBackground: 'transparent',
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: colors.white,
  todayTextColor: colors.primary,
  dayTextColor: colors.text,
  textDisabledColor: '#DCC9D2',
  arrowColor: colors.primary,
  monthTextColor: colors.text,
  textSectionTitleColor: colors.muted,
  dotColor: colors.primary,
  selectedDotColor: colors.white,
  textMonthFontWeight: '800' as const,
  textDayFontWeight: '600' as const,
  textDayHeaderFontWeight: '700' as const,
  textDayFontSize: 15,
  textMonthFontSize: 17,
  textDayHeaderFontSize: 12,
};

export const tabScreenOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: {
    backgroundColor: colors.white,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    elevation: 20,
    zIndex: 100,
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    paddingTop: 8,
    height: layout.tabBar + 12,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '700' as const, marginTop: 2 },
  tabBarItemStyle: { paddingVertical: 2 },
  tabBarHideOnKeyboard: true,
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '800' as const, color: colors.text },
  headerTintColor: colors.primaryDark,
  sceneStyle: { backgroundColor: colors.background },
};
