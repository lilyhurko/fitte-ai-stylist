const { writeLog } = require("./logger");

const circuitBreakers = new Map();

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const resilientFetch = async (
  provider,
  url,
  fetchOptions = {},
  {
    timeoutMs = 10000,
    retries = 2,
    failureThreshold = 3,
    resetAfterMs = 30000,
  } = {},
) => {
  const now = Date.now();

  const circuit = circuitBreakers.get(provider) || {
    failures: 0,
    openUntil: 0,
  };

  if (circuit.openUntil > now) {
    const error = new Error(`Circuit breaker otwarty: ${provider}`);
    error.statusCode = 503;
    error.publicMessage = "Usługa zewnętrzna jest chwilowo niedostępna.";
    throw error;
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      const retryableStatus =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;

      if (!response.ok && retryableStatus) {
        throw new Error(`${provider} odpowiedział kodem ${response.status}`);
      }

      circuitBreakers.set(provider, {
        failures: 0,
        openUntil: 0,
      });

      return response;
    } catch (error) {
      lastError = error;

      writeLog("warn", "external_request_failed", {
        provider,
        attempt: attempt + 1,
        errorName: error.name,
      });

      if (attempt < retries) {
        await wait(500 * 2 ** attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  circuit.failures += 1;

  if (circuit.failures >= failureThreshold) {
    circuit.openUntil = Date.now() + resetAfterMs;

    writeLog("warn", "circuit_breaker_opened", {
      provider,
      resetAfterMs,
    });
  }

  circuitBreakers.set(provider, circuit);
  throw lastError;
};

const resilientOperation = async (
  provider,
  operation,
  { retries = 1, failureThreshold = 3, resetAfterMs = 30000 } = {},
) => {
  const circuit = circuitBreakers.get(provider) || {
    failures: 0,
    openUntil: 0,
  };

  if (circuit.openUntil > Date.now()) {
    const error = new Error(`Circuit breaker otwarty: ${provider}`);
    error.statusCode = 503;
    error.publicMessage = "Usługa zewnętrzna jest chwilowo niedostępna.";
    throw error;
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await operation();

      circuitBreakers.set(provider, {
        failures: 0,
        openUntil: 0,
      });

      return result;
    } catch (error) {
      lastError = error;

      writeLog("warn", "external_operation_failed", {
        provider,
        attempt: attempt + 1,
        errorName: error.name,
      });

      if (attempt < retries) {
        await wait(500 * 2 ** attempt);
      }
    }
  }

  circuit.failures += 1;

  if (circuit.failures >= failureThreshold) {
    circuit.openUntil = Date.now() + resetAfterMs;

    writeLog("warn", "circuit_breaker_opened", {
      provider,
      resetAfterMs,
    });
  }

  circuitBreakers.set(provider, circuit);
  throw lastError;
};

module.exports = {
  resilientFetch,
  resilientOperation,
};