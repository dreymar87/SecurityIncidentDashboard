import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { COUNTRY_NAME_MAP, ISO2_TO_ISO3 } from '../../data/countryNames';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface WorldMapProps {
  countryData: Array<{ country: string; count: string }>;
  title: string;
  color?: string;
}

export function WorldMap({ countryData, title, color = '#0ea5e9' }: WorldMapProps) {
  const maxCount = Math.max(...countryData.map((d) => parseInt(d.count) || 0), 1);
  const colorScale = scaleLinear<string>()
    .domain([0, maxCount])
    .range(['#1e293b', color]);

  // Normalize alpha-2 codes (e.g. "US") to alpha-3 (e.g. "USA") so the
  // lookup against COUNTRY_NAME_MAP (which produces alpha-3 values) works.
  const countryMap = new Map(
    countryData.map((d) => [ISO2_TO_ISO3[d.country] ?? d.country, parseInt(d.count) || 0])
  );

  return (
    <div className="card">
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>{title}</h3>
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <ZoomableGroup zoom={1}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name;
                  const count = countryMap.get(name) ||
                    countryMap.get(COUNTRY_NAME_MAP[name] || '') || 0;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={count > 0 ? colorScale(count) : '#1e293b'}
                      stroke="#0f172a"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: color, outline: 'none', opacity: 0.85 },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
      {countryData.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-1">
          {countryData.slice(0, 6).map((d) => (
            <div
              key={d.country}
              className="flex items-center justify-between text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>{d.country}</span>
              <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                {parseInt(d.count).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-center py-1" style={{ color: 'var(--color-text-faint)' }}>
          No country data yet — sync or import data to populate this map.
        </p>
      )}
    </div>
  );
}
