import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { WorldMap } from '../components/dashboard/WorldMap';
import { COUNTRY_NAME_MAP } from '../data/countryNames';

describe('WorldMap component', () => {
  test('renders the title prop', () => {
    render(<WorldMap countryData={[]} title="Threat Distribution" />);
    expect(screen.getByText('Threat Distribution')).toBeDefined();
  });

  test('shows empty state message when countryData is empty', () => {
    render(<WorldMap countryData={[]} title="Test Map" />);
    expect(screen.getByText(/no country data yet/i)).toBeDefined();
  });

  test('does not show empty state when countryData has entries', () => {
    const data = [{ country: 'United States', count: '42' }];
    render(<WorldMap countryData={data} title="Test Map" />);
    expect(screen.queryByText(/no country data yet/i)).toBeNull();
  });

  test('renders up to 6 country rows in the legend', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      country: `Country ${i + 1}`,
      count: String((i + 1) * 10),
    }));
    render(<WorldMap countryData={data} title="Test Map" />);

    // Only 6 should be shown (WorldMap slices to 6)
    data.slice(0, 6).forEach(({ country }) => {
      expect(screen.getByText(country)).toBeDefined();
    });
    // The 7th and 8th should not appear
    expect(screen.queryByText('Country 7')).toBeNull();
    expect(screen.queryByText('Country 8')).toBeNull();
  });

  test('displays formatted count for each country in legend', () => {
    const data = [{ country: 'Germany', count: '1500' }];
    render(<WorldMap countryData={data} title="Test Map" />);
    expect(screen.getByText('Germany')).toBeDefined();
    // 1500 formatted with toLocaleString → "1,500" in most locales
    expect(screen.getByText(/1[,.]?500/)).toBeDefined();
  });

  test('renders the composable map element', () => {
    render(<WorldMap countryData={[]} title="Test Map" />);
    expect(screen.getByTestId('composable-map')).toBeDefined();
  });
});

describe('COUNTRY_NAME_MAP', () => {
  test('maps Afghanistan to AFG', () => {
    expect(COUNTRY_NAME_MAP['Afghanistan']).toBe('AFG');
  });

  test('maps United States of America to USA', () => {
    expect(COUNTRY_NAME_MAP['United States of America']).toBe('USA');
  });

  test('maps United Kingdom to GBR', () => {
    expect(COUNTRY_NAME_MAP['United Kingdom']).toBe('GBR');
  });

  test('maps Germany to DEU', () => {
    expect(COUNTRY_NAME_MAP['Germany']).toBe('DEU');
  });

  test('map has at least 100 entries', () => {
    expect(Object.keys(COUNTRY_NAME_MAP).length).toBeGreaterThanOrEqual(100);
  });

  test('returns undefined for unknown country names', () => {
    expect(COUNTRY_NAME_MAP['Not A Real Country']).toBeUndefined();
  });
});
