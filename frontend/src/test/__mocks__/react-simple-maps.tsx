import React from 'react';

export const ComposableMap = ({ children }: { children?: React.ReactNode }) => (
  <svg data-testid="composable-map">{children}</svg>
);

export const Geographies = ({
  children,
}: {
  children: (props: { geographies: unknown[] }) => React.ReactNode;
}) => <>{children({ geographies: [] })}</>;

export const Geography = () => <path />;

export const ZoomableGroup = ({ children }: { children?: React.ReactNode }) => (
  <g>{children}</g>
);
