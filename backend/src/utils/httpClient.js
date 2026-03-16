const axios = require('axios');
const logger = require('./logger');

/**
 * Axios wrapper with exponential backoff retry logic.
 * Retries on 429 (rate limit) and 5xx (server error) responses.
 * Respects the Retry-After header when present.
 *
 * @param {import('axios').AxiosRequestConfig} config
 * @param {{ maxRetries?: number, baseDelay?: number }} [options]
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function axiosWithRetry(config, { maxRetries = 3, baseDelay = 1000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await axios(config);
    } catch (err) {
      lastError = err;

      const status = err.response?.status;
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }

      // Honour Retry-After header if present (value is seconds)
      let delay;
      const retryAfter = err.response?.headers?.['retry-after'];
      if (retryAfter) {
        const parsed = parseFloat(retryAfter);
        delay = isNaN(parsed) ? baseDelay : parsed * 1000;
      } else {
        delay = baseDelay * Math.pow(2, attempt);
      }

      logger.warn(`[httpClient] ${status} on ${config.url || config.baseURL} — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

module.exports = { axiosWithRetry };
