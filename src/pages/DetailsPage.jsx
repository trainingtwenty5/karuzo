import { NavLink } from 'react-router-dom';

export default function DetailsPage() {
  return (
    <div className="property-page" style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}>
      <div className="property-header">
        <NavLink to="/oferty" className="back-link" id="backToOffersBtn" data-map-state="missing">
          <i className="fas fa-arrow-left" aria-hidden="true" /> Powrót do listy ofert
        </NavLink>
        <div className="property-meta">
          <h1 id="propertyTitle">Szczegóły oferty</h1>
          <p id="propertyLocation">Wersja React prezentuje poglądowe informacje.</p>
        </div>
      </div>

      <div className="property-layout" id="propertyContent">
        <aside className="property-sidebar">
          <section className="property-card">
            <h2>Parametry</h2>
            <ul className="property-stats">
              <li>
                <span>Powierzchnia</span>
                <strong id="propertyArea">—</strong>
              </li>
              <li>
                <span>Typ działki</span>
                <strong id="propertyType">—</strong>
              </li>
              <li>
                <span>Status</span>
                <strong id="plotStatus">—</strong>
              </li>
            </ul>
          </section>

          <section className="property-card">
            <h2>Cena</h2>
            <div className="price-box">
              <div id="priceValueText" className="price-main">
                Dostępne po integracji z bazą danych.
              </div>
              <div id="pricePerSqm" className="price-note">
                Cena za m² zostanie wyliczona automatycznie.
              </div>
              <div id="priceUpdatedAt" className="price-updated">
                Aktualizacja danych nastąpi po wdrożeniu logiki.
              </div>
            </div>
          </section>

          <section className="property-card">
            <h2>Kontakt</h2>
            <p id="contactName">Zaloguj się, aby zobaczyć dane właściciela.</p>
            <a id="contactPhoneLink" href="tel:" className="btn btn-outline-primary btn-sm" aria-disabled="true">
              <i className="fas fa-phone" aria-hidden="true" /> Zadzwoń
            </a>
            <a id="contactEmailLink" href="mailto:" className="btn btn-outline-primary btn-sm" aria-disabled="true">
              <i className="fas fa-envelope" aria-hidden="true" /> Wyślij e-mail
            </a>
          </section>
        </aside>

        <section className="property-main">
          <article className="property-card">
            <h2>Opis działki</h2>
            <div id="descriptionText" className="property-description">
              <p>
                Prace nad szczegółową prezentacją oferty w React są w toku. Wersja demonstracyjna zawiera przykładowe pola i
                układ strony, które będą zasilane danymi z Firestore w kolejnych iteracjach.
              </p>
            </div>
          </article>

          <article className="property-card">
            <h2>Zdjęcia i mapy</h2>
            <div className="property-media">
              <div className="property-media__map" id="mapSection">
                <div id="propertyMap" className="map-placeholder">
                  <div className="map-placeholder__content">
                    <i className="fas fa-map-marked-alt" aria-hidden="true" />
                    <p>Podgląd mapy zostanie odtworzony w kolejnej wersji.</p>
                  </div>
                </div>
              </div>
              <div className="property-media__gallery" id="mapImageContainer">
                <img id="mapImage" alt="Mapa działki" style={{ display: 'none' }} />
                <div id="mapImagePlaceholder" className="gallery-placeholder">
                  <i className="fas fa-image" aria-hidden="true" />
                  <p>Brak obrazów podglądowych.</p>
                </div>
              </div>
            </div>
          </article>

          <article className="property-card">
            <h2>Udogodnienia</h2>
            <div id="utilitiesGrid" className="utilities-grid">
              <div className="utility-item">
                <span>Prąd</span>
                <strong>—</strong>
              </div>
              <div className="utility-item">
                <span>Woda</span>
                <strong>—</strong>
              </div>
              <div className="utility-item">
                <span>Kanalizacja</span>
                <strong>—</strong>
              </div>
            </div>
          </article>
        </section>
      </div>

      <section className="property-card property-inquiry">
        <h2>Zapytaj o ofertę</h2>
        <form id="inquiryForm" className="inquiry-form">
          <div className="form-group">
            <label htmlFor="inquiryName">Imię i nazwisko</label>
            <input type="text" id="inquiryName" name="name" placeholder="Twoje imię" />
          </div>
          <div className="form-group">
            <label htmlFor="inquiryEmail">Adres e-mail</label>
            <input type="email" id="inquiryEmail" name="email" placeholder="nazwa@domena.pl" />
          </div>
          <div className="form-group">
            <label htmlFor="inquiryMessage">Wiadomość</label>
            <textarea id="inquiryMessage" name="message" rows={4} placeholder="Twoje pytanie" />
          </div>
          <button type="submit" className="btn btn-primary" disabled>
            Wyślij wiadomość
          </button>
        </form>
      </section>
    </div>
  );
}
