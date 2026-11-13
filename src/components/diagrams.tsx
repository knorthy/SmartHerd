import Svg, { Ellipse, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { Platform } from 'react-native';

import { C } from '@/theme';

const FONT = Platform.select({ web: 'system-ui, sans-serif', ios: 'Helvetica Neue', default: 'sans-serif' });

/** Bulletin plate: schematic goat in side view with body-length and chest-height dimension lines. */
export function SideDiagram({ width = 300 }: { width?: number }) {
  return (
    <Svg width={width} height={(width * 140) / 220} viewBox="0 0 220 140" accessibilityLabel="Side view diagram: body length and chest height">
      <G stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round">
        <Path
          fill={C.greenTint}
          d="M46 48 C46 38 54 34 68 34 L128 34 C134 34 138 30 141 25 L147 15 C149 12 152 10 156 10 L166 11 C171 12 173 16 171 20 L163 28 C159 32 156 38 153 46 L151 60 C150 70 145 76 136 77 L64 77 C53 77 46 71 46 61 Z"
        />
        <Path fill="none" d="M152 12 C149 5 143 2 136 3" />
        <Path fill="none" d="M155 18 L146 22" />
        <Path fill="none" d="M169 20 L168 29" />
        <Path fill="none" d="M47 44 L40 36" />
        <Line x1={60} y1={77} x2={60} y2={104} strokeWidth={3} />
        <Line x1={70} y1={77} x2={70} y2={104} strokeWidth={3} />
        <Line x1={130} y1={77} x2={130} y2={104} strokeWidth={3} />
        <Line x1={140} y1={77} x2={140} y2={104} strokeWidth={3} />
        <Line x1={8} y1={104} x2={212} y2={104} stroke={C.rule} strokeWidth={1} />
      </G>
      <G stroke={C.green} strokeWidth={1}>
        <Line x1={46} y1={118} x2={153} y2={118} />
        <Line x1={46} y1={113} x2={46} y2={123} />
        <Line x1={153} y1={113} x2={153} y2={123} />
        <Line x1={186} y1={34} x2={186} y2={77} />
        <Line x1={181} y1={34} x2={191} y2={34} />
        <Line x1={181} y1={77} x2={191} y2={77} />
      </G>
      <SvgText x={99.5} y={134} fontSize={9} fontWeight="600" fontFamily={FONT} fill={C.green} textAnchor="middle">
        Body length
      </SvgText>
      <SvgText x={196} y={58} fontSize={9} fontWeight="600" fontFamily={FONT} fill={C.green}>
        Chest
      </SvgText>
      <SvgText x={196} y={68} fontSize={9} fontWeight="600" fontFamily={FONT} fill={C.green}>
        height
      </SvgText>
    </Svg>
  );
}

/** Top view: the back seen from above, with chest width across the widest point. */
export function TopDiagram({ width = 300 }: { width?: number }) {
  return (
    <Svg width={width} height={(width * 100) / 220} viewBox="0 0 220 100" accessibilityLabel="Top view diagram: chest width">
      <G stroke={C.ink} strokeWidth={1.4}>
        <Ellipse cx={100} cy={46} rx={62} ry={22} fill={C.greenTint} />
        <Ellipse cx={170} cy={46} rx={13} ry={9} fill={C.greenTint} />
        <Path fill="none" strokeLinecap="round" d="M174 39 C180 32 186 30 192 31 M174 53 C180 60 186 62 192 61 M38 46 L28 46" />
      </G>
      <G stroke={C.green} strokeWidth={1}>
        <Line x1={128} y1={24} x2={128} y2={68} />
        <Line x1={123} y1={24} x2={133} y2={24} />
        <Line x1={123} y1={68} x2={133} y2={68} />
      </G>
      <SvgText x={128} y={86} fontSize={9} fontWeight="600" fontFamily={FONT} fill={C.green} textAnchor="middle">
        Chest width
      </SvgText>
    </Svg>
  );
}
