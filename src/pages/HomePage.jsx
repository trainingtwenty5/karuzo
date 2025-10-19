import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';

export default function HomePage() {
  useEffect(() => {
    const faqItems = Array.from(document.querySelectorAll('.faq-item'));
    if (!faqItems.length) {
      return undefined;
    }

    const closeFaqItem = (item) => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!question || !answer) return;
      item.classList.remove('active');
      question.setAttribute('aria-expanded', 'false');
      answer.setAttribute('aria-hidden', 'true');
      answer.style.maxHeight = '0px';
    };

    const openFaqItem = (item) => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!question || !answer) return;
      item.classList.add('active');
      question.setAttribute('aria-expanded', 'true');
      answer.setAttribute('aria-hidden', 'false');
      answer.style.maxHeight = `${answer.scrollHeight}px`;
    };

    const handlers = [];

    const recalcActiveFaq = () => {
      faqItems.forEach((item) => {
        if (item.classList.contains('active')) {
          const answer = item.querySelector('.faq-answer');
          if (answer) {
            answer.style.maxHeight = `${answer.scrollHeight}px`;
          }
        }
      });
    };

    faqItems.forEach((item, index) => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!question || !answer) return;

      if (!answer.id) {
        answer.id = `faq-answer-${index + 1}`;
      }

      question.setAttribute('role', 'button');
      question.setAttribute('tabindex', '0');
      question.setAttribute('aria-controls', answer.id);

      const toggleItem = () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach((other) => {
          if (other !== item) {
            closeFaqItem(other);
          }
        });
        if (isActive) {
          closeFaqItem(item);
        } else {
          openFaqItem(item);
        }
      };

      const onKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleItem();
        }
      };

      question.addEventListener('click', toggleItem);
      question.addEventListener('keydown', onKeyDown);

      if (item.classList.contains('active')) {
        openFaqItem(item);
      } else {
        closeFaqItem(item);
      }

      handlers.push({ question, toggleItem, onKeyDown });
    });

    window.addEventListener('resize', recalcActiveFaq);

    return () => {
      handlers.forEach(({ question, toggleItem, onKeyDown }) => {
        question.removeEventListener('click', toggleItem);
        question.removeEventListener('keydown', onKeyDown);
      });
      window.removeEventListener('resize', recalcActiveFaq);
    };
  }, []);

  return (
    <div className="home-page">
      <div className="container user-dashboard" id="userDashboard" style={{ display: 'none' }}>
        <div className="user-header">
          <h2>Moje oferty</h2>
          <NavLink to="/oferty" className="btn btn-secondary mobile-browse-offers">
            <i className="fas fa-search me-1" aria-hidden="true" /> Przeglądaj oferty
          </NavLink>
          <NavLink to="/dodaj" className="btn btn-primary" id="dashboardAddOffer">
            <i className="fas fa-plus me-1" aria-hidden="true" /> Dodaj ofertę
          </NavLink>
        </div>
        <div className="offers-wrapper" id="userOffers">
          <section className="offers-section" id="ownedOffersSection">
            <div className="offers-section-header">
              <h3 className="offers-subtitle">
                <i className="fas fa-clipboard-list" aria-hidden="true" /> Moje aktywne ogłoszenia
              </h3>
            </div>
            <p className="dashboard-empty" id="ownedOffersEmpty" style={{ display: 'none' }}>
              Nie masz jeszcze żadnych ofert.
            </p>
            <div className="offers-grid" id="userOwnedOffers" />
          </section>

          <section className="offers-section" id="favoriteOffersSection" style={{ display: 'none' }}>
            <div className="offers-section-header">
              <h3 className="offers-subtitle">
                <i className="fas fa-bookmark" aria-hidden="true" /> Moje ulubione
              </h3>
              <span className="offers-section-note">Zapisane działki innych użytkowników.</span>
            </div>
            <p className="dashboard-empty" id="favoriteOffersEmpty" style={{ display: 'none' }}>
              Nie dodałeś jeszcze ulubionych działek.
            </p>
            <div className="offers-grid favorites-grid" id="userFavoriteOffers" />
          </section>
        </div>
      </div>

      <section className="hero" id="home">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>Znajdź swoją wymarzoną działkę</h1>
            <p>
              Dodaj bezpłatne ogłoszenie lub przeglądaj oferty idealnych działek w najlepszych lokalizacjach w Polsce.
            </p>
            <div className="hero-buttons">
              <NavLink to="/oferty" className="btn btn-primary">
                <i className="fas fa-search" aria-hidden="true" /> Przeglądaj oferty
              </NavLink>
              <NavLink to="/dodaj" className="btn btn-secondary" id="heroAddOffer">
                <i className="fas fa-plus" aria-hidden="true" /> Dodaj ogłoszenie
              </NavLink>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://storage.waw.cloud.ovh.net/v1/AUTH_024f82ed62da4186825a5b526cd1a61e/FishFounder/z1.png"
              alt="Wizualizacja działki"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </section>

      <section id="features" className="section features">
        <div className="container">
          <div className="section-title">
            <h2>Dlaczego warto wybrać Grunteo?</h2>
            <p>Skuteczna sprzedaż działek bez zbędnych kosztów</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-line" aria-hidden="true" />
              </div>
              <h3>Analiza rynkowa</h3>
              <p>Darmowa analiza wartości Twojej działki na podstawie aktualnych danych rynkowych.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-users" aria-hidden="true" />
              </div>
              <h3>Szeroki zasięg</h3>
              <p>Dotrzyj do tysięcy potencjalnych kupujących w całej Polsce.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-euro-sign" aria-hidden="true" />
              </div>
              <h3>Zero opłat</h3>
              <p>Dodawanie i przeglądanie ogłoszeń jest całkowicie darmowe.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section course-info">
        <div className="container">
          <div className="info-container">
            <div className="info-image">
              <img
                src="https://storage.waw.cloud.ovh.net/v1/AUTH_024f82ed62da4186825a5b526cd1a61e/FishFounder/z3.png"
                alt="Proces publikacji ogłoszenia"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <div className="info-badge">Proste i szybkie</div>
            </div>
            <div className="info-content">
              <h2>Jak to działa?</h2>
              <ul className="info-list">
                <li>Dodajesz numer działki i podstawowe informacje</li>
                <li>Nasi eksperci przygotowują analizę i ogłoszenie</li>
                <li>W ciągu 12 godzin Twoja oferta jest online</li>
                <li>Kontaktujesz się z zainteresowanymi kupującymi</li>
                <li>Finalizujesz transakcję bez pośredników</li>
              </ul>
              <NavLink to="/dodaj" className="btn btn-primary">
                <i className="fas fa-plus-circle" aria-hidden="true" /> Dodaj ogłoszenie
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      <section className="section stats">
        <div className="container stats-grid">
          <div className="stat-card">
            <div className="stat-number">12h</div>
            <p>Średni czas publikacji ogłoszenia</p>
          </div>
          <div className="stat-card">
            <div className="stat-number">2500+</div>
            <p>Aktywnych kupujących w bazie</p>
          </div>
          <div className="stat-card">
            <div className="stat-number">98%</div>
            <p>Zadowolonych klientów</p>
          </div>
        </div>
      </section>

      <section id="offers" className="section offers-preview">
        <div className="container">
          <div className="section-title">
            <h2>Aktualne oferty</h2>
            <p>Zobacz najnowsze działki dodane na Grunteo</p>
          </div>
          <div className="offers-grid">
            <article className="offer-card">
              <div className="offer-image" aria-hidden="true">
                <span className="offer-tag">Nowość</span>
              </div>
              <div className="offer-content">
                <h3>Przestronna działka budowlana</h3>
                <p>Warszawa, Wilanów</p>
                <ul className="offer-details">
                  <li>
                    <i className="fas fa-vector-square" aria-hidden="true" /> 1200 m²
                  </li>
                  <li>
                    <i className="fas fa-water" aria-hidden="true" /> Media w drodze
                  </li>
                  <li>
                    <i className="fas fa-road" aria-hidden="true" /> Dojazd asfaltowy
                  </li>
                </ul>
                <div className="offer-footer">
                  <div className="offer-price">420 000 zł</div>
                  <NavLink to="/details?id=example-1" className="btn btn-outline-primary btn-sm">
                    Szczegóły
                  </NavLink>
                </div>
              </div>
            </article>

            <article className="offer-card">
              <div className="offer-image" aria-hidden="true">
                <span className="offer-tag">Promocja</span>
              </div>
              <div className="offer-content">
                <h3>Działka inwestycyjna nad jeziorami</h3>
                <p>Giżycko, Warmia-Mazury</p>
                <ul className="offer-details">
                  <li>
                    <i className="fas fa-vector-square" aria-hidden="true" /> 3400 m²
                  </li>
                  <li>
                    <i className="fas fa-water" aria-hidden="true" /> Własne ujęcie wody
                  </li>
                  <li>
                    <i className="fas fa-tree" aria-hidden="true" /> Otulina lasu
                  </li>
                </ul>
                <div className="offer-footer">
                  <div className="offer-price">720 000 zł</div>
                  <NavLink to="/details?id=example-2" className="btn btn-outline-primary btn-sm">
                    Szczegóły
                  </NavLink>
                </div>
              </div>
            </article>

            <article className="offer-card">
              <div className="offer-image" aria-hidden="true">
                <span className="offer-tag">Popularna</span>
              </div>
              <div className="offer-content">
                <h3>Działka rekreacyjna nad jeziorem</h3>
                <p>Jeziorak, woj. warmińsko-mazurskie</p>
                <ul className="offer-details">
                  <li>
                    <i className="fas fa-vector-square" aria-hidden="true" /> 1800 m²
                  </li>
                  <li>
                    <i className="fas fa-water" aria-hidden="true" /> Prąd i woda
                  </li>
                  <li>
                    <i className="fas fa-campground" aria-hidden="true" /> Idealna pod wypoczynek
                  </li>
                </ul>
                <div className="offer-footer">
                  <div className="offer-price">350 000 zł</div>
                  <NavLink to="/details?id=example-3" className="btn btn-outline-primary btn-sm">
                    Szczegóły
                  </NavLink>
                </div>
              </div>
            </article>
          </div>
          <div className="offers-cta">
            <NavLink to="/oferty" className="btn btn-primary">
              <i className="fas fa-search" aria-hidden="true" /> Zobacz wszystkie oferty
            </NavLink>
            <NavLink to="/dodaj" className="btn btn-secondary">
              <i className="fas fa-plus" aria-hidden="true" /> Dodaj swoją ofertę
            </NavLink>
          </div>
        </div>
      </section>

      <section className="section cta-banner">
        <div className="container">
          <div className="cta-content">
            <h2>Masz działkę na sprzedaż?</h2>
            <p>Dodaj swoją ofertę i dotrzyj do tysięcy zainteresowanych kupujących w kilka minut.</p>
            <NavLink to="/dodaj" className="btn btn-light">
              <i className="fas fa-upload" aria-hidden="true" /> Dodaj ogłoszenie
            </NavLink>
          </div>
          <div className="cta-image" aria-hidden="true">
            <i className="fas fa-map-marked-alt" />
          </div>
        </div>
      </section>

      <section className="section testimonials">
        <div className="container">
          <div className="section-title">
            <h2>Zaufali nam</h2>
            <p>Historie sukcesu naszych klientów</p>
          </div>
          <div className="testimonials-grid">
            <blockquote className="testimonial-card">
              <p>
                „Dzięki Grunteo sprzedałem działkę w ciągu dwóch tygodni. Profesjonalna obsługa i pełne wsparcie na każdym etapie.”
              </p>
              <footer>
                <strong>Michał, właściciel działki w Poznaniu</strong>
              </footer>
            </blockquote>
            <blockquote className="testimonial-card">
              <p>
                „Dostałam komplet informacji o działce, która mnie interesowała. Kontakt ze sprzedającym był szybki i bezproblemowy.”
              </p>
              <footer>
                <strong>Agnieszka, inwestorka z Warszawy</strong>
              </footer>
            </blockquote>
            <blockquote className="testimonial-card">
              <p>
                „Platforma pozwoliła mi porównać wiele ofert i wybrać tę najlepszą. Polecam wszystkim szukającym działki.”
              </p>
              <footer>
                <strong>Paweł, kupujący z Wrocławia</strong>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      <section className="section process">
        <div className="container">
          <div className="section-title">
            <h2>Proces dodawania ogłoszenia</h2>
            <p>Trzy proste kroki do sprzedaży działki</p>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <h3>Wypełnij formularz</h3>
              <p>Podaj podstawowe informacje o działce oraz dane kontaktowe.</p>
            </div>
            <div className="process-step">
              <div className="step-number">2</div>
              <h3>Zweryfikuj dane</h3>
              <p>Nasz zespół sprawdza informacje i przygotowuje atrakcyjną ofertę.</p>
            </div>
            <div className="process-step">
              <div className="step-number">3</div>
              <h3>Opublikuj ogłoszenie</h3>
              <p>Oferta trafia na stronę i dociera do zainteresowanych kupujących.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="section faq">
        <div className="container">
          <div className="section-title">
            <h2>Najczęściej zadawane pytania</h2>
            <p>Poznaj odpowiedzi na najważniejsze pytania dotyczące Grunteo.</p>
          </div>
          <div className="faq-list">
            <div className="faq-item active">
              <div className="faq-question">
                <h3>Jak dodać ogłoszenie działki?</h3>
                <i className="fas fa-chevron-down" aria-hidden="true" />
              </div>
              <div className="faq-answer">
                <p>
                  Wystarczy kliknąć przycisk „Dodaj ogłoszenie”, wypełnić formularz z informacjami o działce i przesłać zdjęcia.
                  Nasz zespół zajmie się resztą.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question">
                <h3>Czy korzystanie z platformy jest płatne?</h3>
                <i className="fas fa-chevron-down" aria-hidden="true" />
              </div>
              <div className="faq-answer">
                <p>
                  Dodawanie i przeglądanie ogłoszeń jest całkowicie darmowe. Oferujemy również dodatkowe usługi premium dla
                  sprzedających.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question">
                <h3>Jak długo trwa publikacja ogłoszenia?</h3>
                <i className="fas fa-chevron-down" aria-hidden="true" />
              </div>
              <div className="faq-answer">
                <p>
                  Po weryfikacji danych przez nasz zespół ogłoszenie pojawia się na stronie zwykle w ciągu 12 godzin.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question">
                <h3>Czy mogę edytować moje ogłoszenie?</h3>
                <i className="fas fa-chevron-down" aria-hidden="true" />
              </div>
              <div className="faq-answer">
                <p>
                  Tak, po zalogowaniu się do panelu użytkownika możesz edytować treść ogłoszenia oraz dodawać nowe zdjęcia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section final-cta">
        <div className="container">
          <div className="final-cta-content">
            <h2>Gotowy, aby rozpocząć?</h2>
            <p>Dołącz do grona sprzedających i skorzystaj z bezpłatnej promocji swojej działki.</p>
          </div>
          <div className="final-cta-actions">
            <NavLink to="/dodaj" className="btn btn-primary">
              <i className="fas fa-bullhorn" aria-hidden="true" /> Dodaj ogłoszenie
            </NavLink>
            <NavLink to="/kontakt" className="btn btn-secondary">
              <i className="fas fa-comments" aria-hidden="true" /> Skontaktuj się z nami
            </NavLink>
          </div>
        </div>
      </section>
    </div>
  );
}
