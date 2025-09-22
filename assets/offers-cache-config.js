(function configureOffersCache(global) {
  const OFFERS_CACHE_KEY = 'grunteo::offers-cache::v1';

  // Aktualizuj wartość w polu `revisionHint` za każdym razem, gdy publikujesz nowe oferty.
  // Możesz wpisać tutaj np. znacznik czasu ostatniej modyfikacji (ISO 8601).
  const OFFERS_CACHE_SETTINGS = {
    revisionHint: '2024-06-10T00:00:00Z',
    // ttlMs: 5 * 60 * 1000, // odkomentuj i ustaw liczbę milisekund, aby nadpisać domyślny TTL (15 minut)
    ttlMs: null
  };

  if (typeof OFFERS_CACHE_SETTINGS.revisionHint === 'string' && OFFERS_CACHE_SETTINGS.revisionHint.trim()) {
    global.__OFFERS_REVISION_HINT__ = OFFERS_CACHE_SETTINGS.revisionHint.trim();
  }

  if (Number.isFinite(OFFERS_CACHE_SETTINGS.ttlMs) && OFFERS_CACHE_SETTINGS.ttlMs > 0) {
    global.__OFFERS_CACHE_TTL_MS__ = OFFERS_CACHE_SETTINGS.ttlMs;
  }

  global.bumpOffersRevisionHint = function bumpOffersRevisionHint(nextHint) {
    const resolvedHint = typeof nextHint === 'string' && nextHint.trim()
      ? nextHint.trim()
      : new Date().toISOString();

    global.__OFFERS_REVISION_HINT__ = resolvedHint;

    try {
      global.localStorage?.removeItem(OFFERS_CACHE_KEY);
    } catch (error) {
      console.warn('Nie udało się wyczyścić cache ofert przy bumpOffersRevisionHint:', error);
    }

    return resolvedHint;
  };
})(window);
