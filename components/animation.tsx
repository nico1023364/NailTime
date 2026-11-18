import { ComponentProps, ReactNode, useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Animated, Easing, Platform, Pressable, StyleProp, ViewStyle } from 'react-native';

/**
 * Animaciones ligeras con el API `Animated` incluido en React Native.
 * No agrega dependencias y funciona en Android, iOS y web.
 *
 * En web no existe el driver nativo, así que todas las animaciones usan
 * el driver JS. Solo se animan `opacity` y `transform`, que son seguros
 * en ambos casos.
 */
const useNativeDriver = Platform.OS !== 'web';

type AnimatedStyle = Animated.WithAnimatedValue<ViewStyle>;
type PressableProps = ComponentProps<typeof Pressable>;

/** Aparición suave: fundido + deslizamiento vertical. */
export function useEnter(delay = 0, duration = 320, distance = 14): AnimatedStyle {
  const [value] = useState(() => new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      value.setValue(0);
      const animation = Animated.timing(value, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      });
      animation.start();
      return () => animation.stop();
    }, [value, delay, duration])
  );

  return {
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
}

/** Entrada con rebote para el logo y los iconos de éxito. */
export function usePop(trigger = true, delay = 0): AnimatedStyle {
  const [scale] = useState(() => new Animated.Value(0.6));

  useFocusEffect(
    useCallback(() => {
      if (!trigger) {
        scale.setValue(1);
        return;
      }
      scale.setValue(0.6);
      const animation = Animated.spring(scale, {
        toValue: 1,
        speed: 18,
        bounciness: 9,
        delay,
        useNativeDriver,
      });
      animation.start();
      return () => animation.stop();
    }, [scale, trigger, delay])
  );

  return {
    opacity: scale.interpolate({
      inputRange: [0.6, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [{ scale }],
  };
}

/** Contenedor con animación de entrada. */
export function FadeIn({
  children,
  style,
  delay = 0,
  duration = 320,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
}) {
  const enter = useEnter(delay, duration);
  return <Animated.View style={[style, enter]}>{children}</Animated.View>;
}

/** Contenedor con animación de rebote. `trigger` permite repetirla al cambiar. */
export function PopIn({
  children,
  style,
  trigger = true,
  delay = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  trigger?: string | number | boolean;
  delay?: number;
}) {
  const pop = usePop(Boolean(trigger), delay);
  return <Animated.View style={[style, pop]}>{children}</Animated.View>;
}

/** Envuelve un control y le da feedback escalado al presionar. */
export function PressScale({
  children,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityRole,
  accessibilityLabel,
  hitSlop,
  scaleTo = 0.97,
}: {
  children: PressableProps['children'];
  onPress?: PressableProps['onPress'];
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
  disabled?: boolean;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityLabel?: string;
  hitSlop?: PressableProps['hitSlop'];
  scaleTo?: number;
}) {
  const [scale] = useState(() => new Animated.Value(1));

  const animate = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={event => {
          animate(scaleTo);
          onPressIn?.(event);
        }}
        onPressOut={event => {
          animate(1);
          onPressOut?.(event);
        }}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        hitSlop={hitSlop}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
