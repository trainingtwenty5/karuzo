import { NavLink } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found" style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}>
      <div className="container">
        <h1>404</h1>
        <p>Nie znaleziono strony. Sprawdź adres lub wróć na stronę główną.</p>
        <NavLink to="/" className="btn btn-primary">
          Wróć na stronę główną
        </NavLink>
      </div>
    </div>
  );
}
