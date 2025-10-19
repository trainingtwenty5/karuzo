(function configureOffersCache(global) {
  const OFFERS_CACHE_KEY = 'grunteo::offers-cache::v1';
  global.__OFFERS_CACHE_KEY__ = OFFERS_CACHE_KEY;

  // Aktualizuj wartość w polu `revisionHint` za każdym razem, gdy publikujesz nowe oferty.
  // Możesz wpisać tutaj np. znacznik czasu ostatniej modyfikacji (ISO 8601).
  const OFFERS_CACHE_SETTINGS = {
    revisionHint: '2024-06-10T00:00:00Z',
    // Czas życia wpisów cache w milisekundach (tutaj 15 minut).
    ttlMs: 15 * 60 * 1000,
    // Ile dokumentów pobieramy na jedną stronę zapytania do Firestore.
    pageSize: 200,
    // Maksymalna liczba stron pobieranych podczas jednego odświeżania danych.
    maxPages: 5,
    // Po jakim czasie od zapisania danych traktujemy je jako potencjalnie nieaktualne (ms).
    staleAfterMs: 5 * 60 * 1000
  };

  // Zapytania wymagają indeksów Firestore:
  // 1) propertyListings.updatedAt (rosnąco) – używany w oferty.html do paginacji.
  // 2) propertyListings.ownerLookup (array-contains-any) – używany na stronie głównej w loadUserOffers.
  // Sprawdź w konsoli Firebase → Firestore → Indexes, czy powyższe indeksy są utworzone.

  if (typeof OFFERS_CACHE_SETTINGS.revisionHint === 'string' && OFFERS_CACHE_SETTINGS.revisionHint.trim()) {
    global.__OFFERS_REVISION_HINT__ = OFFERS_CACHE_SETTINGS.revisionHint.trim();
  }

  if (Number.isFinite(OFFERS_CACHE_SETTINGS.ttlMs) && OFFERS_CACHE_SETTINGS.ttlMs > 0) {
    global.__OFFERS_CACHE_TTL_MS__ = OFFERS_CACHE_SETTINGS.ttlMs;
  }

  if (Number.isFinite(OFFERS_CACHE_SETTINGS.pageSize) && OFFERS_CACHE_SETTINGS.pageSize > 0) {
    global.__OFFERS_PAGE_SIZE__ = Math.floor(OFFERS_CACHE_SETTINGS.pageSize);
  }

  if (Number.isFinite(OFFERS_CACHE_SETTINGS.maxPages) && OFFERS_CACHE_SETTINGS.maxPages > 0) {
    global.__OFFERS_MAX_PAGES__ = Math.floor(OFFERS_CACHE_SETTINGS.maxPages);
  }

  if (Number.isFinite(OFFERS_CACHE_SETTINGS.staleAfterMs) && OFFERS_CACHE_SETTINGS.staleAfterMs > 0) {
    global.__OFFERS_STALE_AFTER_MS__ = OFFERS_CACHE_SETTINGS.staleAfterMs;
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