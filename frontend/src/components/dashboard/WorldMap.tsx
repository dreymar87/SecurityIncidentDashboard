import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface WorldMapProps {
  countryData: Array<{ country: string; count: string }>;
  title: string;
  color?: string;
}

// Country name to ISO mapping for common countries
const COUNTRY_NAME_MAP: Record<string, string> = {
  'United States': 'USA', 'United Kingdom': 'GBR', 'Germany': 'DEU',
  'France': 'FRA', 'China': 'CHN', 'Russia': 'RUS', 'India': 'IND',
  'Brazil': 'BRA', 'Canada': 'CAN', 'Australia': 'AUS', 'Japan': 'JPN',
  'South Korea': 'KOR', 'Netherlands': 'NLD', 'Sweden': 'SWE',
};

export function WorldMap({ countryData, title, color = '#0ea5e9' }: WorldMapProps) {
  const maxCount = Math.max(...countryData.map((d) => parseInt(d.count) || 0), 1);
  const colorScale = scaleLinear<string>()
    .domain([0, maxCount])
    .range(['#1f2937', color]);

  const countryMap = new Map(
    countryData.map((d) => [d.country, parseInt(d.count) || 0])
  );

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      <div className="rounded-lg overflow-hidden bg-gray-950 border border-gray-800">
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
                      fill={count > 0 ? colorScale(count) : '#1f2937'}
                      stroke="#111827"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: color, outline: 'none', opacity: 0.8 },
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
      {countryData.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-1">
          {countryData.slice(0, 6).map((d) => (
            <div key={d.country} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-gray-800/50">
              <span className="text-gray-400">{d.country}</span>
              <span className="font-mono text-gray-300">{parseInt(d.count).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
