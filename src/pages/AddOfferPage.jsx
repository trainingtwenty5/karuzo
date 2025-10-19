export default function AddOfferPage() {
  return (
    <div className="add-offer-page" style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}>
      <div className="add-offer-layout">
        <div className="map-container">
          <div id="map" className="map-placeholder">
            <div className="map-placeholder__content">
              <i className="fas fa-location-dot" aria-hidden="true" />
              <p>Wybór działki na mapie będzie dostępny po integracji modułu.</p>
            </div>
          </div>
          <div className="map-overlay map-overlay-desktop">
            <button id="clearPlotsBtn" className="btn-overlay" type="button" disabled>
              🗑️ Wyczyść punkty
            </button>
            <button id="zoomPlotsBtn" className="btn-overlay" type="button" disabled>
              🟩 Przybliż działki
            </button>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="autoSave" disabled />
              <label className="form-check-label" htmlFor="autoSave">
                Auto-zapis
              </label>
            </div>
          </div>
        </div>

        <div className="form-container">
          <p className="form-heading">Dodaj darmowe ogłoszenie</p>
          <p className="lead text-center mb-4 d-none d-lg-block">
            Kliknij na mapę, aby wskazać lokalizację działki — funkcja zostanie wkrótce udostępniona.
          </p>
          <hr />

          <form id="propertyForm" className="mt-3">
            <div className="mb-3">
              <label htmlFor="firstName" className="form-label">
                Imię *
              </label>
              <input type="text" className="form-control" id="firstName" required />
            </div>

            <div className="mb-3">
              <label htmlFor="phone" className="form-label">
                Telefon *
              </label>
              <input
                type="tel"
                className="form-control"
                id="phone"
                required
                pattern="^(\\+48\\d{9}|\\d{9})$"
                placeholder="Np. 505849404 lub +48505849404"
              />
              <div className="form-text">Numer telefonu: 9 cyfr lub +48 i 9 cyfr</div>
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                E-mail *
              </label>
              <input type="email" className="form-control" id="email" required />
            </div>

            <div className="mb-3">
              <label htmlFor="city" className="form-label">
                Miejscowość *
              </label>
              <input type="text" className="form-control" id="city" required />
            </div>

            <div className="mb-3">
              <label htmlFor="plotSize" className="form-label">
                Powierzchnia działki (m²)
              </label>
              <input type="number" className="form-control" id="plotSize" min="0" step="0.01" />
            </div>

            <div className="mb-3">
              <label htmlFor="price" className="form-label">
                Cena (zł)
              </label>
              <input type="number" className="form-control" id="price" min="0" step="1" />
            </div>

            <div className="mb-3">
              <label htmlFor="description" className="form-label">
                Opis działki
              </label>
              <textarea id="description" className="form-control" rows={5} placeholder="Opisz najważniejsze informacje." />
            </div>

            <div className="mb-3">
              <label htmlFor="utilities" className="form-label">
                Dostępne media
              </label>
              <select id="utilities" className="form-select" multiple>
                <option value="electricity">Prąd</option>
                <option value="water">Woda</option>
                <option value="sewage">Kanalizacja</option>
                <option value="gas">Gaz</option>
                <option value="internet">Internet</option>
              </select>
              <div className="form-text">Przytrzymaj Ctrl / Cmd, aby wybrać kilka opcji.</div>
            </div>

            <div className="mb-3">
              <label htmlFor="notes" className="form-label">
                Uwagi dla naszego zespołu
              </label>
              <textarea
                id="notes"
                className="form-control"
                rows={4}
                placeholder="Podziel się dodatkowymi informacjami lub pytaniami."
              />
            </div>

            <div className="form-check mb-3">
              <input className="form-check-input" type="checkbox" id="termsConsent" required />
              <label className="form-check-label" htmlFor="termsConsent">
                Akceptuję regulamin i politykę prywatności serwisu Grunteo.
              </label>
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled>
              Wyślij zgłoszenie
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
