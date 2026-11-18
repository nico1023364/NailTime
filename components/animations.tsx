import { ComponentProps, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../constants/theme';

const useNativeDriver = Platform.OS !== 'web';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* -------------------------------------------------------------------------- */
/*  Hooks de animación adicionales                                            */
/* -------------------------------------------------------------------------- */

/** Flotación suave y continua (para iconos decorativos, estrellas, etc.). */
export function useFloat(amplitude = 6, duration = 2200) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value, amplitude, duration]);
  return {
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -amplitude],
        }),
      },
    ],
  };
}

/** Pulso suave (para badges, puntos de atención, botones de acción). */
export function usePulse(min = 0.96, max = 1.04, duration = 1100) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return {
    transform: [
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [min, max],
        }),
      },
    ],
  };
}

/** Entrada escalonada para listas: cada índice entra con un delay progresivo. */
export function useStagger(index: number, step = 55, baseDelay = 60) {
  const [value] = useState(() => new Animated.Value(0));
  useFocusEffect(
    useCallback(() => {
      value.setValue(0);
      const animation = Animated.timing(value, {
        toValue: 1,
        duration: 300,
        delay: baseDelay + index * step,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      });
      animation.start();
      return () => animation.stop();
    }, [value, index, step, baseDelay])
  );
  return {
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
}

/** Posición de brillo para efecto shimmer en estados de carga. */
export function useShimmer(duration = 1300) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver })
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return value.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, SCREEN_WIDTH],
  });
}

/* -------------------------------------------------------------------------- */
/*  Componentes de animación                                                  */
/* -------------------------------------------------------------------------- */

/** Icono que flota suavemente. */
export function FloatingIcon({
  name,
  size = 26,
  color = colors.primary,
  amplitude,
  duration,
  style,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
  amplitude?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const float = useFloat(amplitude, duration);
  return (
    <Animated.View style={[float, style]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

/** Badge pulsante para atraer atención. */
export function PulseBadge({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const pulse = usePulse();
  return <Animated.View style={[pulse, style]}>{children}</Animated.View>;
}

/** Item de lista con entrada escalonada. */
export function StaggerItem({ index, children, style }: { index: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const enter = useStagger(index);
  return <Animated.View style={[style, enter]}>{children}</Animated.View>;
}

/** Bloque de carga con efecto shimmer. */
export function ShimmerBlock({ width, height = 14, borderRadius = 8, style }: { width: number | string; height?: number; borderRadius?: number; style?: StyleProp<ViewStyle> }) {
  const translateX = useShimmer();
  return (
    <View style={[{ width, height, borderRadius, backgroundColor: colors.soft, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 90,
          backgroundColor: 'rgba(255,255,255,0.65)',
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Carrusel                                                                  */
/* -------------------------------------------------------------------------- */

function CarouselDot({ active }: { active: boolean }) {
  const [width] = useState(() => new Animated.Value(active ? 20 : 6));
  useEffect(() => {
    Animated.spring(width, {
      toValue: active ? 20 : 6,
      speed: 20,
      bounciness: 6,
      useNativeDriver: false,
    }).start();
  }, [active, width]);
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          backgroundColor: active ? colors.primary : colors.primaryLight,
        },
      ]}
    />
  );
}

export function Carousel<T>({
  items,
  renderItem,
  width: itemWidth = SCREEN_WIDTH - 72,
  gap = 12,
  autoPlay = false,
  autoPlayInterval = 3500,
  showDots = true,
  contentStyle,
  style,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  width?: number;
  gap?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showDots?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!autoPlay || items.length < 2) return;
    const interval = setInterval(() => {
      const next = (activeRef.current + 1) % items.length;
      scrollRef.current?.scrollTo({ x: next * (itemWidth + gap), animated: true });
      setActive(next);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, items.length, itemWidth, gap]);

  if (items.length === 0) return null;

  return (
    <View style={style}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth + gap}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={[{ paddingHorizontal: 20, gap }, contentStyle]}
        onMomentumScrollEnd={event => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (itemWidth + gap));
          const clamped = Math.max(0, Math.min(items.length - 1, index));
          setActive(clamped);
        }}
      >
        {items.map((item, index) => (
          <View key={index} style={{ width: itemWidth }}>
            {renderItem(item, index)}
          </View>
        ))}
      </ScrollView>
      {showDots && items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((_, index) => (
            <CarouselDot key={index} active={index === active} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Imagen con zoom                                                           */
/* -------------------------------------------------------------------------- */

const MAX_ZOOM = 4;
const DOUBLE_TAP_MS = 320;

function touchDistance(touches: readonly { pageX: number; pageY: number }[]) {
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function ZoomImage({
  uri,
  style,
  resizeMode = 'cover',
  accessibilityLabel,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch';
  accessibilityLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));
  const [translateX] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(0));
  const [openAnim] = useState(() => new Animated.Value(0));

  // Estado mutable del gesto en un ref: se muta solo dentro de handlers,
  // nunca durante el render (cumple react-hooks/refs e immutability).
  const gesture = useRef({
    zoomed: false,
    lastTap: 0,
    pinching: false,
    pinchStartDist: 0,
    pinchStartScale: 1,
    currentScale: 1,
    tx: 0,
    ty: 0,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    moved: false,
  });

  const applyZoom = (next: boolean) => {
    const g = gesture.current;
    g.zoomed = next;
    if (next) {
      g.currentScale = 2.4;
      Animated.timing(scale, { toValue: 2.4, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      g.currentScale = 1;
      g.tx = 0;
      g.ty = 0;
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    }
  };

  const resetView = () => {
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    const g = gesture.current;
    g.zoomed = false;
    g.lastTap = 0;
    g.pinching = false;
    g.pinchStartDist = 0;
    g.currentScale = 1;
    g.tx = 0;
    g.ty = 0;
  };

  const openViewer = () => {
    setOpen(true);
    Animated.timing(openAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const closeViewer = () => {
    Animated.timing(openAnim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      resetView();
      setOpen(false);
    });
  };

  // --- Gestos nativos: doble toque, pellizco y arrastre. ---
  const onResponderGrant = (evt: GestureResponderEvent) => {
    const g = gesture.current;
    const touches = evt.nativeEvent.touches;
    g.moved = false;
    if (touches.length >= 2) {
      g.pinching = true;
      g.pinchStartDist = touchDistance(touches);
      g.pinchStartScale = g.currentScale;
    } else {
      g.pinching = false;
      const t = touches[0];
      if (t) {
        g.startX = t.pageX;
        g.startY = t.pageY;
        g.startTx = g.tx;
        g.startTy = g.ty;
      }
    }
  };

  const onResponderMove = (evt: GestureResponderEvent) => {
    const g = gesture.current;
    const touches = evt.nativeEvent.touches;
    if (touches.length >= 2) {
      const dist = touchDistance(touches);
      if (!g.pinching) {
        g.pinching = true;
        g.pinchStartDist = dist;
        g.pinchStartScale = g.currentScale;
      }
      const next = Math.min(MAX_ZOOM, Math.max(1, g.pinchStartScale * (dist / (g.pinchStartDist || 1))));
      g.currentScale = next;
      scale.setValue(next);
      g.zoomed = next > 1.02;
      if (!g.zoomed) {
        g.tx = 0;
        g.ty = 0;
        translateX.setValue(0);
        translateY.setValue(0);
      }
      g.moved = true;
    } else if (g.zoomed && touches.length === 1) {
      const t = touches[0];
      if (!t) return;
      const dx = t.pageX - g.startX;
      const dy = t.pageY - g.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) g.moved = true;
      g.tx = g.startTx + dx;
      g.ty = g.startTy + dy;
      translateX.setValue(g.tx);
      translateY.setValue(g.ty);
    }
  };

  const onResponderRelease = () => {
    const g = gesture.current;
    if (g.pinching) {
      g.pinching = false;
      g.lastTap = 0;
      if (!g.zoomed) applyZoom(false);
      return;
    }
    if (!g.moved) {
      const now = Date.now();
      if (now - g.lastTap < DOUBLE_TAP_MS) {
        g.lastTap = 0;
        applyZoom(!g.zoomed);
      } else {
        g.lastTap = now;
      }
    } else {
      g.lastTap = 0;
    }
  };

  const viewerStyle = {
    opacity: openAnim,
    transform: [
      {
        scale: openAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  return (
    <>
      <Pressable onPress={openViewer} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? 'Ampliar foto'} style={style}>
        <Animated.Image source={{ uri }} resizeMode={resizeMode} style={StyleSheet.absoluteFill} />
      </Pressable>
      <Modal visible={open} transparent statusBarTranslucent onRequestClose={closeViewer}>
        <View style={styles.viewer}>
          <Animated.View style={[styles.viewerContent, viewerStyle]}>
            <Animated.Image
              source={{ uri }}
              resizeMode="contain"
              style={[styles.viewerImage, { transform: [{ translateX }, { translateY }, { scale }] }]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={onResponderGrant}
              onResponderMove={onResponderMove}
              onResponderRelease={onResponderRelease}
              onResponderTerminate={onResponderRelease}
            />
          </Animated.View>
          <Pressable onPress={closeViewer} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.viewerHint}>Doble toque para acercar · Pellizca para hacer zoom · Arrastra para explorar</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
  dot: { height: 6, borderRadius: 3 },
  viewer: { flex: 1, backgroundColor: 'rgba(20,10,15,0.96)', justifyContent: 'center', alignItems: 'center' },
  viewerContent: { width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  viewerHint: { position: 'absolute', bottom: 30, left: 20, color: 'rgba(255,255,255,0.7)', fontSize: 12, maxWidth: '55%' },
});
