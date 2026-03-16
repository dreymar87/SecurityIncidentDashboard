import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { SeverityBadge } from '../components/vulnerabilities/SeverityBadge';

describe('SeverityBadge', () => {
  test('renders CRITICAL level with correct label and class', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByText('CRITICAL')).toBeDefined();
    expect(container.querySelector('.badge-critical')).toBeTruthy();
  });

  test('renders HIGH with correct class', () => {
    const { container } = render(<SeverityBadge severity="HIGH" />);
    expect(screen.getByText('HIGH')).toBeDefined();
    expect(container.querySelector('.badge-high')).toBeTruthy();
  });

  test('renders MEDIUM with correct class', () => {
    const { container } = render(<SeverityBadge severity="MEDIUM" />);
    expect(screen.getByText('MEDIUM')).toBeDefined();
    expect(container.querySelector('.badge-medium')).toBeTruthy();
  });

  test('renders LOW with correct class', () => {
    const { container } = render(<SeverityBadge severity="LOW" />);
    expect(screen.getByText('LOW')).toBeDefined();
    expect(container.querySelector('.badge-low')).toBeTruthy();
  });

  test('renders NONE with correct class', () => {
    const { container } = render(<SeverityBadge severity="NONE" />);
    expect(screen.getByText('NONE')).toBeDefined();
    expect(container.querySelector('.badge-none')).toBeTruthy();
  });

  test('falls back to UNKNOWN when severity is null', () => {
    const { container } = render(<SeverityBadge severity={null} />);
    expect(screen.getByText('UNKNOWN')).toBeDefined();
    expect(container.querySelector('.badge-unknown')).toBeTruthy();
  });

  test('normalises lowercase input to uppercase label', () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText('CRITICAL')).toBeDefined();
  });

  test('normalises mixed-case input', () => {
    render(<SeverityBadge severity="High" />);
    expect(screen.getByText('HIGH')).toBeDefined();
  });

  test('renders an SVG icon element inside the badge', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
