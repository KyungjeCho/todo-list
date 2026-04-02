import React from 'react';
import { View } from 'react-native';

const Svg = (props: Record<string, unknown>) => (
  <View {...props}>{props.children as React.ReactNode}</View>
);

const Path = (props: Record<string, unknown>) => <View {...props} />;
const Circle = (props: Record<string, unknown>) => <View {...props} />;
const Polyline = (props: Record<string, unknown>) => <View {...props} />;
const Rect = (props: Record<string, unknown>) => <View {...props} />;
const Line = (props: Record<string, unknown>) => <View {...props} />;

export { Path, Circle, Polyline, Rect, Line };
export default Svg;
