export default function ContactPage() {
  return (
    <div className="contact-page" style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}>
      <section className="contact-hero">
        <div className="container">
          <div className="hero-content">
            <h1>Skontaktuj się z nami</h1>
            <p className="hero-subtitle">Porozmawiajmy o Twojej nieruchomości</p>
            <p className="hero-description">
              Masz pytania dotyczące ogłoszeń lub współpracy? Wypełnij formularz, a nasz zespół wróci do Ciebie z odpowiedzią w
              wybranym przez Ciebie terminie.
            </p>

            <div className="hero-meta">
              <div className="meta-item">
                <i className="fas fa-clock" aria-hidden="true" />
                <div>
                  <span>Godziny pracy</span>
                  <strong>Poniedziałek - Piątek 9:00 - 18:00</strong>
                </div>
              </div>
              <div className="meta-item">
                <i className="fas fa-phone" aria-hidden="true" />
                <div>
                  <span>Zadzwoń do nas</span>
                  <a href="tel:+48505849404">+48 505 849 404</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-main">
        <div className="container">
          <div className="contact-wrapper">
            <div className="contact-quick-info">
              <h2>Bezpośrednie dane kontaktowe</h2>
              <p>
                Preferujesz szybki telefon lub wiadomość e-mail? Sprawdź, w jaki sposób możesz się z nami skontaktować bez
                oczekiwania.
              </p>

              <div className="contact-highlights">
                <div className="contact-card">
                  <i className="fas fa-envelope" aria-hidden="true" />
                  <div>
                    <span>Adres e-mail</span>
                    <p>info@grunteo.pl</p>
                  </div>
                </div>
                <div className="contact-card">
                  <i className="fas fa-phone" aria-hidden="true" />
                  <div>
                    <span>Telefon</span>
                    <p>+48 505 849 404</p>
                  </div>
                </div>
                <div className="contact-card">
                  <i className="fas fa-map-marker-alt" aria-hidden="true" />
                  <div>
                    <span>Biuro</span>
                    <p>ul. Edwarda Suchardy 4, 50-362 Wrocław</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-form" aria-labelledby="contactFormTitle">
              <h2 id="contactFormTitle">Napisz do nas</h2>
              <form id="contactForm" action="#" method="post">
                <div className="form-group">
                  <label htmlFor="contactName">Imię i nazwisko</label>
                  <input type="text" id="contactName" name="contactName" autoComplete="name" placeholder="Wpisz swoje imię i nazwisko" />
                </div>

                <div className="form-group">
                  <label htmlFor="contactEmail">Adres e-mail *</label>
                  <input
                    type="email"
                    id="contactEmail"
                    name="contactEmail"
                    autoComplete="email"
                    placeholder="np. anna.kowalska@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contactPhone">Telefon</label>
                  <input
                    type="tel"
                    id="contactPhone"
                    name="contactPhone"
                    autoComplete="tel"
                    placeholder="np. +48 600 000 000"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contactTopic">Wybierz temat</label>
                  <select id="contactTopic" name="contactTopic" defaultValue="general">
                    <option value="general">Pytanie ogólne</option>
                    <option value="offer">Dodanie oferty</option>
                    <option value="cooperation">Współpraca B2B</option>
                    <option value="support">Wsparcie techniczne</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="contactMessage">Wiadomość *</label>
                  <textarea id="contactMessage" name="contactMessage" rows={5} placeholder="Napisz wiadomość" required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="contactDate">Preferowana data kontaktu</label>
                    <input type="date" id="contactDate" name="contactDate" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contactTime">Preferowana godzina</label>
                    <input type="time" id="contactTime" name="contactTime" />
                  </div>
                </div>

                <div className="form-check">
                  <input type="checkbox" id="marketingConsent" name="marketingConsent" />
                  <label htmlFor="marketingConsent">
                    Chcę otrzymywać informacje o nowych ofertach i aktualnościach.
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" disabled>
                  Wyślij wiadomość
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-map">
        <div className="container">
          <h2>Znajdziesz nas tutaj</h2>
          <div className="map-placeholder">
            <div className="map-placeholder__content">
              <i className="fas fa-map" aria-hidden="true" />
              <p>Mapa lokalizacji pojawi się po integracji z usługą Map.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
