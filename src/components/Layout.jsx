import { NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useLegacyScript } from '../hooks/useLegacyScript';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export default function Layout() {
  useLegacyScript('/legacy/auth-basic.js', { module: true });
  useLegacyScript('/legacy/cookies.js');

  useEffect(() => {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    const mobileAuth = document.getElementById('mobileAuth');

    const toggleMenu = () => {
      navMenu?.classList.toggle('active');
      if (mobileAuth) {
        const isOpen = navMenu?.classList.contains('active');
        mobileAuth.style.display = isOpen ? 'flex' : 'none';
      }
    };

    mobileMenuBtn?.addEventListener('click', toggleMenu);

    const handleResize = () => {
      if (window.innerWidth > 768) {
        navMenu?.classList.remove('active');
        if (mobileAuth) {
          mobileAuth.style.display = 'none';
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      mobileMenuBtn?.removeEventListener('click', toggleMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      if (!container) return;

      const wrap = document.createElement('div');
      wrap.className = `toast-lite toast-${type}`;
      wrap.setAttribute('role', 'status');
      wrap.setAttribute('aria-live', 'polite');

      const iconMap = {
        success: '✓',
        info: 'ℹ',
        warning: '!',
        error: '✕'
      };

      const icon = iconMap[type] || 'ℹ';

      wrap.innerHTML = `
        <div class="toast-icon" aria-hidden="true">${icon}</div>
        <div class="toast-msg">${message}</div>
        <button class="toast-close" aria-label="Zamknij">&times;</button>
      `;

      const close = () => {
        wrap.classList.remove('show');
        window.setTimeout(() => wrap.remove(), 160);
      };

      wrap.querySelector('.toast-close')?.addEventListener('click', close);

      container.appendChild(wrap);
      window.requestAnimationFrame(() => wrap.classList.add('show'));

      const timeout = window.setTimeout(close, 4000);
      wrap.addEventListener('mouseenter', () => window.clearTimeout(timeout), { once: true });
    }

    async function showConfirmModal(message) {
      const modal = document.getElementById('confirmModal');
      if (!modal) return false;

      const messageElement = modal.querySelector('.confirm-message');
      if (messageElement) {
        messageElement.textContent = message;
      }
      modal.classList.add('show');

      const yesBtn = modal.querySelector('.confirm-yes');
      const cancelBtn = modal.querySelector('.confirm-cancel');

      return new Promise((resolve) => {
        const cleanup = () => {
          modal.classList.remove('show');
          yesBtn?.removeEventListener('click', onYes);
          cancelBtn?.removeEventListener('click', onCancel);
          modal.removeEventListener('click', onOutside);
        };

        const onYes = () => {
          cleanup();
          resolve(true);
        };

        const onCancel = () => {
          cleanup();
          resolve(false);
        };

        const onOutside = (event) => {
          if (event.target === modal) {
            cleanup();
            resolve(false);
          }
        };

        yesBtn?.addEventListener('click', onYes, { once: true });
        cancelBtn?.addEventListener('click', onCancel, { once: true });
        modal.addEventListener('click', onOutside, { once: true });
      });
    }

    window.showToast = showToast;
    window.showConfirmModal = showConfirmModal;

    return () => {
      delete window.showToast;
      delete window.showConfirmModal;
    };
  }, []);

  return (
    <div className="app-shell">
      <div className="top-navbar">
        <div className="contact-info">
          <i className="fas fa-clock" aria-hidden="true" /> Poniedziałek - Piątek 9:00 - 18:00
          <span>
            <i className="fas fa-phone" aria-hidden="true" /> +48 505 849 404
          </span>
        </div>

        <div className="auth-buttons" id="authButtons">
          <button className="btn btn-outline-primary btn-sm" id="loginBtn" type="button">
            <i className="fas fa-sign-in-alt" aria-hidden="true" /> Zaloguj się
          </button>
          <button className="btn btn-primary btn-sm" id="registerBtn" type="button">
            <i className="fas fa-user-plus" aria-hidden="true" /> Zarejestruj się
          </button>
        </div>

        <div className="user-menu" id="userMenu" style={{ display: 'none' }}>
          <button className="btn btn-outline-primary btn-sm" id="accountBtn" type="button">
            <i className="fas fa-user" aria-hidden="true" /> Moje konto
          </button>
          <button className="btn btn-secondary btn-sm" id="logoutBtn" type="button">
            <i className="fas fa-sign-out-alt" aria-hidden="true" /> Wyloguj
          </button>
        </div>
      </div>

      <header>
        <NavLink to="/" className="logo">
          <img src="https://grunteo.pl/brand/logo-horizontal-dark.svg" alt="Logo serwisu" />
        </NavLink>

        <nav className="desktop-nav">
          <NavLink to="/" end className={({ isActive }) => classNames('nav-link', isActive && 'active')}>
            Strona główna
          </NavLink>
          <NavLink to="/oferty" className={({ isActive }) => classNames('nav-link', isActive && 'active')}>
            Oferty
          </NavLink>
          <NavLink to="/dodaj" className={({ isActive }) => classNames('nav-link', isActive && 'active')}>
            Dodaj
          </NavLink>
          <NavLink to="/kontakt" className={({ isActive }) => classNames('nav-link', isActive && 'active')}>
            Kontakt
          </NavLink>
        </nav>

        <NavLink to="/dodaj" className="desktop-add-offer">
          <i className="fas fa-plus" aria-hidden="true" /> Dodaj ofertę
        </NavLink>

        <NavLink to="/dodaj" className="mobile-add-offer">
          <i className="fas fa-plus" aria-hidden="true" /> Dodaj ofertę
        </NavLink>

        <button className="mobile-menu-btn" type="button" aria-label="Otwórz menu">
          <i className="fas fa-bars" aria-hidden="true" />
        </button>

        <nav className="nav-menu">
          <NavLink to="/" end className={({ isActive }) => classNames('nav-link', isActive && 'active')}>
            Strona główna
          </NavLink>
          <NavLink to="/oferty" className={({ isActive }) => classNames('nav-link', isActive && 'active')}>
            Oferty
          </NavLink>
          <NavLink to="/dodaj" className={({ isActive }) => classNames('nav-link', isActive && 'active')}>
            Dodaj
          </NavLink>
          <NavLink to="/kontakt" className={({ isActive }) => classNames('nav-link', isActive && 'active')}>
            Kontakt
          </NavLink>
          <a href="#userMenu" className="nav-link">
            Moje konto
          </a>
          <div className="mobile-auth" id="mobileAuth" style={{ display: 'none' }} />
        </nav>
      </header>

      <div className="toast-container" id="toastContainer" aria-live="polite" aria-atomic="true" />

      <div className="confirm-modal" id="confirmModal" role="dialog" aria-modal="true">
        <div className="confirm-box">
          <h3 className="confirm-title">Potwierdzenie</h3>
          <p className="confirm-message" />
          <div className="confirm-actions">
            <button className="confirm-btn confirm-cancel" type="button">
              Anuluj
            </button>
            <button className="confirm-btn confirm-yes" type="button">
              Usuń
            </button>
          </div>
        </div>
      </div>

      <main>
        <Outlet />
      </main>

      <footer id="contact">
        <div className="footer-content">
          <div className="footer-contact">
            <h3>Skontaktuj się z nami</h3>
            <p><i className="fas fa-phone" aria-hidden="true" /> +48 505 849 404</p>
            <p><i className="fas fa-envelope" aria-hidden="true" /> biuro@grunteo.pl</p>
            <p><i className="fas fa-map-marker-alt" aria-hidden="true" /> ul. Hubska 52/14, 50-502 Wrocław</p>
          </div>
          <div className="footer-links">
            <h3>Przydatne linki</h3>
            <ul>
              <li>
                <NavLink to="/polityka-prywatnosci">Polityka prywatności</NavLink>
              </li>
              <li>
                <NavLink to="/regulamin">Regulamin</NavLink>
              </li>
              <li>
                <NavLink to="/rodo">RODO</NavLink>
              </li>
            </ul>
          </div>
          <div className="footer-newsletter">
            <h3>Bądź na bieżąco</h3>
            <p>Zapisz się, aby otrzymywać informacje o nowych ofertach i aktualnościach.</p>
            <form className="newsletter-form">
              <label className="visually-hidden" htmlFor="newsletterEmail">
                Twój e-mail
              </label>
              <input type="email" id="newsletterEmail" placeholder="Twój e-mail" required />
              <button type="submit" className="btn btn-primary">
                Zapisz się
              </button>
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Grunteo. Wszystkie prawa zastrzeżone.</p>
          <div className="footer-social">
            <a href="https://www.facebook.com/grunteopl" target="_blank" rel="noreferrer">
              <i className="fab fa-facebook" aria-hidden="true" />
              <span className="visually-hidden">Facebook</span>
            </a>
            <a href="https://www.linkedin.com/company/grunteo" target="_blank" rel="noreferrer">
              <i className="fab fa-linkedin" aria-hidden="true" />
              <span className="visually-hidden">LinkedIn</span>
            </a>
          </div>
        </div>
      </footer>

      <div className="modal" id="loginModal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Zaloguj się</h3>
            <button className="modal-close" type="button" aria-label="Zamknij">
              &times;
            </button>
          </div>
          <form id="loginForm">
            <div className="form-group">
              <label htmlFor="loginEmail">Email</label>
              <input type="email" id="loginEmail" required />
            </div>
            <div className="form-group">
              <label htmlFor="loginPassword">Hasło</label>
              <input type="password" id="loginPassword" required />
            </div>
            <button type="submit" className="btn btn-primary w-100">
              Zaloguj się
            </button>
            <button type="button" className="btn btn-outline-primary w-100" id="googleLoginBtnLogin">
              <i className="fab fa-google" aria-hidden="true" /> Kontynuuj z Google
            </button>
            <p className="switch-form">
              Nie masz konta?{' '}
              <a href="#rejestracja" id="switchToRegister">
                Zarejestruj się
              </a>
            </p>
          </form>
        </div>
      </div>

      <div className="modal" id="registerModal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Załóż konto</h3>
            <button className="modal-close" type="button" aria-label="Zamknij">
              &times;
            </button>
          </div>
          <form id="registerForm">
            <div className="form-group">
              <label htmlFor="registerName">Imię i nazwisko</label>
              <input type="text" id="registerName" />
            </div>
            <div className="form-group">
              <label htmlFor="registerEmail">Email</label>
              <input type="email" id="registerEmail" required />
            </div>
            <div className="form-group">
              <label htmlFor="registerPassword">Hasło</label>
              <input type="password" id="registerPassword" required minLength={6} />
            </div>
            <div className="form-group">
              <label htmlFor="registerConfirmPassword">Powtórz hasło</label>
              <input type="password" id="registerConfirmPassword" required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary w-100">
              Zarejestruj się
            </button>
            <button type="button" className="btn btn-outline-primary w-100" id="googleLoginBtn">
              <i className="fab fa-google" aria-hidden="true" /> Kontynuuj z Google
            </button>
            <p className="switch-form">
              Masz już konto?{' '}
              <a href="#logowanie" id="switchToLogin">
                Zaloguj się
              </a>
            </p>
          </form>
        </div>
      </div>

      <div className="cookie-banner" data-cookie-banner="" role="dialog" aria-modal="false" aria-live="polite" tabIndex={-1}>
        <div className="cookie-banner__icon" aria-hidden="true">
          <i className="fas fa-cookie-bite" />
        </div>
        <div className="cookie-banner__content">
          <h3 className="cookie-banner__title">Szanujemy Twoją prywatność</h3>
          <p className="cookie-banner__text">
            Korzystamy z plików cookies, aby zapewnić prawidłowe działanie serwisu, analizować ruch i rozwijać nasze usługi.
            Więcej informacji znajdziesz w naszej{' '}
            <NavLink to="/polityka-prywatnosci">Polityce prywatności i cookies</NavLink>.
          </p>
          <div className="cookie-banner__actions">
            <button type="button" className="btn btn-primary cookie-banner__btn" data-cookie-accept="">
              Akceptuję wszystkie
            </button>
            <button type="button" className="btn btn-secondary cookie-banner__btn" data-cookie-decline="">
              Tylko niezbędne
            </button>
            <NavLink className="cookie-banner__link" to="/polityka-prywatnosci#cookies">
              Ustawienia cookies
            </NavLink>
          </div>
        </div>
      </div>

      <button
        className="cookie-preferences"
        type="button"
        data-cookie-preferences=""
        hidden
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        <i className="fas fa-cookie-bite" aria-hidden="true" />
        Ustawienia cookies
      </button>
    </div>
  );
}
