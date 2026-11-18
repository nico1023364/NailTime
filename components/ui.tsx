import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ColorValue,
  Image,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, layout, radius, softShadow } from '../constants/theme';
import { FadeIn, PressScale } from './animation';
import { ShimmerBlock } from './animations';
import { initials } from '../lib/format';
import { AppointmentStatus } from '../lib/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const tabIcon = (name: IconName, activeName?: IconName) =>
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused?: boolean }) {
    const [scale] = useState(() => new Animated.Value(1));
    useEffect(() => {
      Animated.spring(scale, {
        toValue: focused ? 1.18 : 1,
        speed: 22,
        bounciness: 8,
        useNativeDriver: true,
      }).start();
    }, [focused, scale]);
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={focused && activeName ? activeName : name} color={color as string} size={size} />
      </Animated.View>
    );
  };

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';

const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.soft, fg: colors.primaryDark, border: colors.soft },
  outline: { bg: 'transparent', fg: colors.primaryDark, border: colors.primary },
  ghost: { bg: 'transparent', fg: colors.muted, border: 'transparent' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  success: { bg: colors.successSoft, fg: colors.success, border: colors.successSoft },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = palette[variant];
  const isBrand = variant === 'primary';
  return (
    <PressScale onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={title}>
      <View
        style={[
          styles.button,
          small && styles.buttonSmall,
          { backgroundColor: isBrand ? gradients.brand[1] : p.bg, borderColor: p.border },
          isBrand && styles.buttonBrand,
          disabled && styles.disabled,
          style,
        ]}
      >
        {isBrand ? <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={p.fg} /> : null}
            <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: p.fg }]}>{title}</Text>
          </>
        )}
      </View>
    </PressScale>
  );
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const content = [styles.card, !padded && styles.cardFlush, style];
  if (onPress) {
    return (
      <PressScale onPress={onPress} accessibilityRole="button">
        <View style={content}>{children}</View>
      </PressScale>
    );
  }
  return <View style={content}>{children}</View>;
}

export function Input({ label, icon, error, style, right, ...props }: TextInputProps & { label?: string; icon?: IconName; error?: string; right?: ReactNode }) {
  const [hidden, setHidden] = useState(true);
  const secure = !!props.secureTextEntry;
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, props.multiline && styles.inputWrapMultiline, error ? styles.inputError : null]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} /> : null}
        <TextInput
          placeholderTextColor="#B8A3AD"
          style={[styles.input, props.multiline && styles.inputMultiline, style]}
          {...props}
          secureTextEntry={secure ? hidden : false}
        />
        {secure ? (
          <Pressable onPress={() => setHidden(v => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={colors.muted} />
          </Pressable>
        ) : (
          right
        )}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button">
      <View style={[styles.chip, selected && styles.chipSelected]}>
        {icon ? <Ionicons name={icon} size={15} color={selected ? colors.white : colors.primaryDark} /> : null}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </View>
    </PressScale>
  );
}

const statusMap: Record<AppointmentStatus, { label: string; bg: string; fg: string; icon: IconName }> = {
  pendiente: { label: 'Pendiente', bg: colors.warningSoft, fg: colors.warning, icon: 'time-outline' },
  confirmada: { label: 'Confirmada', bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle-outline' },
  completada: { label: 'Completada', bg: colors.goldSoft, fg: colors.gold, icon: 'sparkles-outline' },
  cancelada: { label: 'Cancelada', bg: colors.dangerSoft, fg: colors.danger, icon: 'close-circle-outline' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = statusMap[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={12} color={s.fg} />
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function SectionTitle({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionMain}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Avatar({ name, size = 44, uri, light }: { name: string; size?: number; uri?: string; light?: boolean }) {
  const dims = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={dims} />;
  return (
    <View style={[styles.avatar, dims, light && styles.avatarLight]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }, light && { color: colors.primary }]}>{initials(name)}</Text>
    </View>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderText}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Screen({
  children,
  contentStyle,
  refreshControl,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenOuter}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <FadeIn style={[styles.screenInner, contentStyle]}>{children}</FadeIn>
    </ScrollView>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map(o => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" style={[styles.segmentItem, value === o.value && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowLabelStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong]}>{value}</Text>
    </View>
  );
}

export function InfoLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function IconBadge({ icon, size = 40, tone = 'soft' }: { icon: IconName; size?: number; tone?: 'soft' | 'brand' }) {
  const brand = tone === 'brand';
  return (
    <View style={[styles.iconBadge, { width: size, height: size, borderRadius: size / 2 }, brand && styles.iconBadgeBrand]}>
      <Ionicons name={icon} size={size * 0.48} color={brand ? colors.white : colors.primary} />
    </View>
  );
}

export function LoadingView({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
      <ShimmerBlock width={140} height={10} />
      {label ? <Text style={styles.loadingText}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  buttonBrand: { borderWidth: 0 },
  buttonSmall: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.sm },
  buttonText: { fontSize: 16, fontWeight: '800' },
  buttonTextSmall: { fontSize: 14 },
  disabled: { opacity: 0.5 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...softShadow,
  },
  cardFlush: { padding: 0 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.softer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
  inputError: { borderColor: colors.danger, backgroundColor: '#FFF6F7' },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
  inputMultiline: { minHeight: 86, textAlignVertical: 'top', paddingVertical: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  error: { color: colors.danger, fontSize: 12, flex: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextSelected: { color: colors.white },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 18, gap: 6 },
  emptyIcon: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  emptyAction: { marginTop: 14, alignSelf: 'stretch' },
  section: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 26, marginBottom: 12, gap: 12 },
  sectionMain: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  sectionSubtitle: { fontSize: 13, color: colors.muted, marginTop: 3 },
  sectionAction: { fontSize: 14, fontWeight: '700', color: colors.primary },
  avatar: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLight: { backgroundColor: colors.white },
  avatarText: { color: colors.white, fontWeight: '800' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  pageHeaderText: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: colors.muted, marginTop: 3 },
  screen: { flex: 1, backgroundColor: colors.background },
  screenOuter: { flexGrow: 1, alignItems: 'center' },
  screenInner: { width: '100%', maxWidth: layout.maxWidth, paddingHorizontal: layout.screenPadding, paddingTop: 20, paddingBottom: layout.tabBar + 44 },
  segment: { flexDirection: 'row', backgroundColor: colors.soft, borderRadius: radius.md, padding: 4, marginBottom: 18 },
  segmentItem: { flex: 1, paddingVertical: 11, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.white, ...softShadow },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: colors.primaryDark, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, gap: 12 },
  rowLabel: { fontSize: 14, color: colors.muted },
  rowLabelStrong: { color: colors.text, fontWeight: '800', fontSize: 16 },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  rowStrong: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  infoText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  iconBadge: { backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  iconBadgeBrand: { backgroundColor: colors.primary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
});
