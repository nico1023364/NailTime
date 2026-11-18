import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppointmentCard } from '../../components/AppointmentCard';
import { ServiceCard } from '../../components/ServiceCard';
import { Avatar, Card, Chip, EmptyState, IconBadge, IconName, Screen, SectionTitle } from '../../components/ui';
import { FadeIn, PopIn, PressScale } from '../../components/animation';
import { Carousel, FloatingIcon, StaggerItem, ZoomImage } from '../../components/animations';
import { colors, gradients, radius, shadow } from '../../constants/theme';
import { compareAppointments, firstName, friendlyDate, isUpcoming } from '../../lib/format';
import { call, openRoute, whatsapp } from '../../lib/native';
import { useStore } from '../../lib/store';

function HeroAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.94}>
      <View style={styles.heroAction}>
        <FloatingIcon name={icon} size={20} color={colors.white} amplitude={3} duration={1800} />
        <Text style={styles.heroActionText}>{label}</Text>
      </View>
    </PressScale>
  );
}

function PortfolioSlide({ uri, index }: { uri: string; index: number }) {
  return (
    <View style={styles.slideWrap}>
      <ZoomImage uri={uri} style={styles.slideImage} accessibilityLabel={`Trabajo ${index + 1}`} />
    </View>
  );
}

export default function Inicio() {
  const session = useStore(s => s.session);
  const business = useStore(s => s.business);
  const services = useStore(s => s.services);
  const appointments = useStore(s => s.appointments);
  const portfolio = useStore(s => s.portfolio);
  const refresh = useStore(s => s.refresh);
  const [category, setCategory] = useState('Todos');
  const [refreshing, setRefreshing] = useState(false);

  const active = useMemo(() => services.filter(s => s.active), [services]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(active.map(s => s.category)))], [active]);
  const visible = category === 'Todos' ? active : active.filter(s => s.category === category);
  const next = useMemo(
    () => appointments.filter(a => a.clientId === session?.id && isUpcoming(a)).sort(compareAppointments)[0],
    [appointments, session?.id]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch {
      // Si falla, la lista se mantiene; el usuario puede reintentar.
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        <FadeIn style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hola, {firstName(session?.name ?? '')}</Text>
            <Text style={styles.sub}>¿Lista para consentir tus uñas?</Text>
          </View>
          <PopIn delay={100}>
            <Avatar name={session?.name ?? ''} />
          </PopIn>
          <FloatingIcon name="sparkles-outline" size={22} color={colors.gold} amplitude={5} style={styles.headerSparkle} />
        </FadeIn>

        {!business.configured ? (
          <Card style={styles.notice}>
            <IconBadge icon="sparkles-outline" size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>El estudio está en preparación</Text>
              <Text style={styles.noticeText}>
                Muy pronto podrás ver los servicios, los horarios y reservar tu cita desde aquí.
              </Text>
            </View>
          </Card>
        ) : (
          <>
            <FadeIn delay={80}>
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                <View style={styles.heroCircle} />
                <View style={styles.heroCircleSmall} />
                <FloatingIcon name="sparkles" size={18} color="rgba(255,255,255,0.55)" amplitude={7} style={styles.heroFloatOne} />
                <FloatingIcon name="star" size={12} color="rgba(255,255,255,0.4)" amplitude={5} duration={2600} style={styles.heroFloatTwo} />
                <View style={styles.heroTop}>
                  <PopIn delay={140}>
                    <Avatar name={business.name} size={54} light />
                  </PopIn>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroName}>{business.name}</Text>
                    <Text style={styles.heroAddress} numberOfLines={1}>
                      {business.address}
                    </Text>
                  </View>
                </View>
                <Text style={styles.heroBio}>{business.bio}</Text>
                <View style={styles.heroActions}>
                  <HeroAction
                    icon="logo-whatsapp"
                    label="WhatsApp"
                    onPress={() => whatsapp(business.whatsapp, `Hola ${firstName(business.owner)}, quiero información sobre tus servicios.`)}
                  />
                  <HeroAction icon="call-outline" label="Llamar" onPress={() => call(business.phone)} />
                  <HeroAction icon="navigate-outline" label="Cómo llegar" onPress={() => openRoute(business.latitude, business.longitude)} />
                </View>
              </LinearGradient>
            </FadeIn>

            {portfolio.length > 0 ? (
              <View style={styles.carouselSection}>
                <SectionTitle title="Trabajos recientes" subtitle="Doble toque o pellizca para ampliar" />
                <Carousel
                  items={portfolio}
                  autoPlay={portfolio.length > 1}
                  autoPlayInterval={3800}
                  width={210}
                  gap={12}
                  renderItem={(p, index) => <PortfolioSlide uri={p.uri} index={index} />}
                />
              </View>
            ) : null}

            {next ? (
              <>
                <SectionTitle title="Tu próxima cita" action="Ver todas" onAction={() => router.navigate('/citas')} />
                <StaggerItem index={0}>
                  <AppointmentCard appointment={next} subtitle={friendlyDate(next.date)} onPress={() => router.push(`/cita/${next.id}`)} />
                </StaggerItem>
              </>
            ) : active.length > 0 ? (
              <Card style={styles.emptyNext} onPress={() => router.push(`/reservar/${active[0].id}`)}>
                <IconBadge icon="sparkles-outline" size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyNextTitle}>Agenda tu primera cita</Text>
                  <Text style={styles.emptyNextText}>Elige un servicio y reserva en segundos.</Text>
                </View>
                <FloatingIcon name="chevron-forward" size={20} color={colors.muted} amplitude={2} />
              </Card>
            ) : null}

            <SectionTitle title="Servicios" />
            {visible.length === 0 ? (
              <Card>
                <EmptyState
                  icon="pricetags-outline"
                  title="Aún no hay servicios"
                  text="El estudio todavía no ha publicado sus servicios. Vuelve a revisar muy pronto."
                />
              </Card>
            ) : (
              <>
                {categories.length > 1 ? (
                  <View style={styles.chipsScroll}>
                    {categories.map(c => (
                      <Chip key={c} label={c} selected={c === category} onPress={() => setCategory(c)} />
                    ))}
                  </View>
                ) : null}
                {visible.map((s, i) => (
                  <StaggerItem key={s.id} index={i}>
                    <ServiceCard service={s} onPress={() => router.push(`/reservar/${s.id}`)} right={<FloatingIcon name="chevron-forward" size={20} color={colors.muted} amplitude={2} />} />
                  </StaggerItem>
                ))}
              </>
            )}
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerSparkle: { position: 'absolute', right: 54, top: -12 },
  hello: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  sub: { fontSize: 15, color: colors.muted, marginTop: 2 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 },
  noticeTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  noticeText: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 19 },
  hero: { borderRadius: radius.xl, padding: 20, marginTop: 20, overflow: 'hidden', ...shadow },
  heroCircle: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.09)', right: -60, top: -70 },
  heroCircleSmall: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.07)', left: -30, bottom: -30 },
  heroFloatOne: { position: 'absolute', right: 28, top: 58 },
  heroFloatTwo: { position: 'absolute', left: 34, bottom: 72 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroName: { fontSize: 19, fontWeight: '800', color: colors.white },
  heroAddress: { fontSize: 13, color: '#FFE0EC', marginTop: 2 },
  heroBio: { fontSize: 14, color: colors.white, marginTop: 14, lineHeight: 20, opacity: 0.95 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  heroAction: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.md, paddingVertical: 11, alignItems: 'center', gap: 4, minHeight: 54, justifyContent: 'center' },
  heroActionText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  emptyNext: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  emptyNextTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  emptyNextText: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  carouselSection: { marginTop: 2 },
  slideWrap: { height: 210, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.soft, ...shadow },
  slideImage: { width: '100%', height: '100%' },
  chipsScroll: { flexDirection: 'row', gap: 8, marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 14 },
});
