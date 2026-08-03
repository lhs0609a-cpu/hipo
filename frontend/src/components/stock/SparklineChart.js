import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

const Y_PADDING = 2;

export default function SparklineChart({
  data = [],
  width = 60,
  height = 24,
  color,
  showLastDot = false,
}) {
  // Determine the line color based on trend direction
  const lineColor = useMemo(() => {
    if (color) return color;
    if (data.length < 2) return COLORS.up;
    return data[data.length - 1] >= data[0] ? COLORS.up : COLORS.down;
  }, [color, data]);

  // Convert data points to SVG polyline coordinate string
  const { points, lastX, lastY } = useMemo(() => {
    if (data.length < 2) {
      return { points: '', lastX: 0, lastY: 0 };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // avoid division by zero for flat lines

    const usableHeight = height - Y_PADDING * 2;
    const stepX = width / (data.length - 1);

    const coords = data.map((value, index) => {
      const x = index * stepX;
      // Invert Y so higher values go up
      const y = Y_PADDING + usableHeight - ((value - min) / range) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const lastIdx = data.length - 1;
    const lx = lastIdx * stepX;
    const ly = Y_PADDING + usableHeight - ((data[lastIdx] - min) / range) * usableHeight;

    return {
      points: coords.join(' '),
      lastX: lx,
      lastY: ly,
    };
  }, [data, width, height]);

  // Nothing to render with fewer than 2 data points
  if (data.length < 2) {
    return <View style={[styles.container, { width, height }]} />;
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showLastDot && (
          <Circle
            cx={lastX}
            cy={lastY}
            r={2.5}
            fill={lineColor}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
