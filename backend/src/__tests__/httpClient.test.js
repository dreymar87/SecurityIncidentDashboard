'use strict';

jest.mock('axios');

const axios = require('axios');
const { axiosWithRetry } = require('../utils/httpClient');

beforeEach(() => {
  jest.clearAllMocks();
});

function makeAxiosError(status, headers = {}) {
  const err = new Error(`Request failed with status ${status}`);
  err.response = { status, headers };
  return err;
}

describe('axiosWithRetry', () => {
  test('returns response immediately on success (no retries)', async () => {
    const mockResponse = { data: { ok: true }, status: 200 };
    axios.mockResolvedValueOnce(mockResponse);

    const result = await axiosWithRetry(
      { url: 'http://example.com' },
      { maxRetries: 3, baseDelay: 1 }
    );

    expect(result).toBe(mockResponse);
    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('retries on 429 and eventually throws after maxRetries', async () => {
    axios.mockRejectedValue(makeAxiosError(429));

    await expect(
      axiosWithRetry({ url: 'http://example.com' }, { maxRetries: 2, baseDelay: 1 })
    ).rejects.toThrow('429');

    expect(axios).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  test('retries on 503 server error and eventually throws', async () => {
    axios.mockRejectedValue(makeAxiosError(503));

    await expect(
      axiosWithRetry({ url: 'http://example.com' }, { maxRetries: 1, baseDelay: 1 })
    ).rejects.toThrow('503');

    expect(axios).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });

  test('does not retry on 400 client error', async () => {
    axios.mockRejectedValue(makeAxiosError(400));

    await expect(
      axiosWithRetry({ url: 'http://example.com' }, { maxRetries: 3, baseDelay: 1 })
    ).rejects.toThrow();

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('succeeds on retry after initial 503', async () => {
    const mockResponse = { data: { ok: true }, status: 200 };
    axios.mockRejectedValueOnce(makeAxiosError(503)).mockResolvedValueOnce(mockResponse);

    const result = await axiosWithRetry(
      { url: 'http://example.com' },
      { maxRetries: 2, baseDelay: 1 }
    );

    expect(result).toBe(mockResponse);
    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('respects Retry-After header: uses header value (seconds) as delay', async () => {
    const mockResponse = { data: {}, status: 200 };
    axios
      .mockRejectedValueOnce(makeAxiosError(429, { 'retry-after': '5' }))
      .mockResolvedValueOnce(mockResponse);

    // Mock setTimeout to run immediately but capture delay values
    const delays = [];
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
      delays.push(delay);
      fn();
      return 0;
    });

    await axiosWithRetry({ url: 'http://example.com' }, { maxRetries: 2, baseDelay: 100 });

    // Retry-After: 5 → delay should be 5000ms
    expect(delays).toContain(5000);

    setTimeoutSpy.mockRestore();
  });

  test('uses exponential backoff: baseDelay * 2^attempt for each retry', async () => {
    const err503 = makeAxiosError(503);
    const mockResponse = { data: {}, status: 200 };
    axios
      .mockRejectedValueOnce(err503)
      .mockRejectedValueOnce(err503)
      .mockResolvedValueOnce(mockResponse);

    const delays = [];
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
      delays.push(delay);
      fn();
      return 0;
    });

    await axiosWithRetry({ url: 'http://example.com' }, { maxRetries: 3, baseDelay: 1000 });

    // attempt 0 → 1000 * 2^0 = 1000ms, attempt 1 → 1000 * 2^1 = 2000ms
    expect(delays).toContain(1000);
    expect(delays).toContain(2000);

    setTimeoutSpy.mockRestore();
  });
});
