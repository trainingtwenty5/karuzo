import { useEffect } from 'react';

export default function OffersPage() {
  useEffect(() => {
    const handleResize = () => {
      const map = document.getElementById('map');
      if (map) {
        map.setAttribute('data-ready', 'true');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="offers-app">
      <div className="main-layout">
        <div className="map-container">
          <div id="map" className="map-placeholder">
            <div className="map-placeholder__content">
              <i className="fas fa-map" aria-hidden="true" />
              <p>Widok mapy dostępny wkrótce w wersji React.</p>
            </div>
          </div>
          <div id="map-controls" />
        </div>

        <div className="content-container">
          <div className="sidebar-stack">
            <div className="voronoi-panel" id="voronoiPanel">
              <div className="voronoi-panel__header">
                <h3 className="filters-title voronoi-panel__title" id="voronoiPanelTitle">
                  Wycena nieruchomości (beta)
                </h3>
                <div className="voronoi-toggle" role="group" aria-labelledby="voronoiPanelTitle">
                  <div className="voronoi-toggle__controls">
                    <input
                      type="checkbox"
                      id="toggleVoronoiLayer"
                      className="voronoi-toggle__input"
                      aria-label="Przełącz warstwę wyceny nieruchomości"
                    />
                    <button type="button" className="voronoi-toggle__option" data-voronoi-toggle="on" aria-pressed="false">
                      Wł.
                    </button>
                    <button type="button" className="voronoi-toggle__option" data-voronoi-toggle="off" aria-pressed="false">
                      Wył.
                    </button>
                  </div>
                </div>
              </div>
              <div className="voronoi-legend" aria-live="polite">
                <div className="voronoi-legend__item">
                  <span className="voronoi-legend__swatch voronoi-legend__swatch--selected" aria-hidden="true" />
                  <span className="voronoi-legend__label">Zaznaczona wycena</span>
                </div>
                <div className="voronoi-legend__item">
                  <span className="voronoi-legend__swatch voronoi-legend__swatch--source" aria-hidden="true" />
                  <span className="voronoi-legend__label">Źródło wyceny</span>
                </div>
                <div className="voronoi-legend__item">
                  <span className="voronoi-legend__swatch voronoi-legend__swatch--filtered" aria-hidden="true">
                    &times;
                  </span>
                  <span className="voronoi-legend__label">Dane odfiltrowane</span>
                </div>
                <div className="voronoi-legend__item">
                  <span className="voronoi-legend__swatch voronoi-legend__swatch--archival" aria-hidden="true">
                    &times;
                  </span>
                  <span className="voronoi-legend__label">Dane archiwalne</span>
                </div>
              </div>
              <div className="voronoi-inspector" id="voronoiInspector" aria-hidden="true" hidden>
                <div className="voronoi-inspector__summary" id="voronoiInspectorSummary" hidden>
                  <div className="voronoi-inspector__summary-header">
                    <span className="voronoi-inspector__summary-title">Podsumowanie</span>
                    <span className="voronoi-inspector__summary-badge" id="voronoiInspectorSummaryBadge" hidden>
                      szac.
                    </span>
                  </div>
                  <div className="voronoi-inspector__summary-grid">
                    <div className="voronoi-inspector__summary-item">
                      <span className="voronoi-inspector__summary-label">Średnia cena m²</span>
                      <span className="voronoi-inspector__summary-value" id="voronoiInspectorAvgValue">
                        —
                      </span>
                    </div>
                    <div className="voronoi-inspector__summary-item">
                      <span className="voronoi-inspector__summary-label">Szacowana wartość działki</span>
                      <span className="voronoi-inspector__summary-value" id="voronoiInspectorEstimateValue">
                        —
                      </span>
                    </div>
                  </div>
                </div>
                <p
                  className="voronoi-inspector__empty"
                  id="voronoiInspectorEmpty"
                  data-default-message="Kliknij poligon, aby zobaczyć procenty tagów."
                >
                  Kliknij poligon, aby zobaczyć procenty tagów.
                </p>
                <ul className="voronoi-inspector__list" id="voronoiInspectorList" />
              </div>
            </div>

            <div className="filters-panel" id="filtersPanel">
              <h3 className="filters-title">Filtruj działki</h3>
              <div className="filters-row sort-row">
                <span className="filters-label">Sortuj:</span>
                <div className="sort-buttons">
                  <button type="button" className="sort-chip" data-sort-key="price" aria-pressed="false">
                    Cena
                  </button>
                  <button type="button" className="sort-chip" data-sort-key="area" aria-pressed="false">
                    Powierzchnia
                  </button>
                </div>
              </div>
              <div className="filters-row tags-row">
                <span className="filters-label">Tagi:</span>
                <div className="tags-area">
                  <div className="tags-wrapper" id="tagFiltersList" data-expanded="false">
                    <span className="tag-placeholder">Ładuję tagi…</span>
                  </div>
                  <button type="button" className="toggle-tags-btn" id="toggleTagsBtn" aria-expanded="false" hidden>
                    Pokaż wszystkie tagi
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="offers-section">
            <div className="section-title">
              <h2>Oferty działek</h2>
            </div>
            <div className="offers-list" id="offersList">
              <div className="offers-empty">Wersja React nie zawiera jeszcze listy ofert.</div>
            </div>
          </div>

          <div className="offers-section">
            <div className="section-title">
              <h2>Moje oferty</h2>
            </div>
            <div id="userDashboard">
              <div className="offers-grid" id="userOffers">
                <div className="offers-empty">Zaloguj się, aby zobaczyć własne ogłoszenia.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
