import type { StyleProp, ViewStyle } from 'react-native';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface BusinessMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  /** Allow panning and zooming. Defaults to true. */
  interactive?: boolean;
  /** Allow dragging the pin to pick a new location. */
  draggable?: boolean;
  showsUserLocation?: boolean;
  height?: number;
  /** Fill the available vertical space instead of using a fixed height. */
  fill?: boolean;
  onCoordinateChange?: (coordinate: MapCoordinate) => void;
  style?: StyleProp<ViewStyle>;
}
