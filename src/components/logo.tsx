import { Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { C, T } from '@/theme';

import { MARK } from './logo-paths';

export function LogoMark({ size = 32, color = C.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="SmartHerd">
      <G fill={color}>
        <Path d={MARK.head} />
        <Path d={MARK.hornL} />
        <Path d={MARK.hornR} />
        <Path d={MARK.earL} />
        <Path d={MARK.earR} />
      </G>
      <G stroke={color} strokeWidth={2.6} strokeLinecap="square" fill="none">
        <Path d={MARK.rule} />
        <Path d={MARK.tickL} />
        <Path d={MARK.tickR} />
      </G>
    </Svg>
  );
}

/** Mark + wordmark, used in screen headers. */
export function Brand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="header">
      <LogoMark size={26} />
      <Text style={[T.label, { color: C.ink, letterSpacing: 0.2 }]}>SmartHerd</Text>
    </View>
  );
}
