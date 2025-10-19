export default function EditOfferPage() {
  return (
    <div className="edit-offer-page" style={{ paddingTop: 'calc(var(--topbar-height) + var(--header-height))' }}>
      <div className="edit-offer-container">
        <h1>Edytuj ogłoszenie</h1>
        <p className="lead">
          Panel edycji ofert jest w trakcie przenoszenia do React. Poniższy formularz prezentuje układ i najważniejsze pola,
          które zostaną połączone z bazą danych w kolejnych wdrożeniach.
        </p>

        <form id="editOfferForm" className="edit-form">
          <div className="form-section">
            <h2>Dane podstawowe</h2>
            <div className="form-group">
              <label htmlFor="editTitle">Tytuł ogłoszenia</label>
              <input type="text" id="editTitle" name="title" placeholder="Np. Działka budowlana 1200 m²" />
            </div>
            <div className="form-group">
              <label htmlFor="editPrice">Cena (zł)</label>
              <input type="number" id="editPrice" name="price" min="0" step="1" />
            </div>
            <div className="form-group">
              <label htmlFor="editArea">Powierzchnia (m²)</label>
              <input type="number" id="editArea" name="area" min="0" step="0.01" />
            </div>
          </div>

          <div className="form-section">
            <h2>Opis</h2>
            <div className="form-group">
              <label htmlFor="editDescription">Opis szczegółowy</label>
              <textarea
                id="editDescription"
                name="description"
                rows={6}
                placeholder="Opisz najważniejsze cechy działki oraz informacje o okolicy."
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Kontakt</h2>
            <div className="form-group">
              <label htmlFor="editContactName">Osoba kontaktowa</label>
              <input type="text" id="editContactName" name="contactName" />
            </div>
            <div className="form-group">
              <label htmlFor="editContactPhone">Telefon</label>
              <input type="tel" id="editContactPhone" name="contactPhone" placeholder="Np. 505849404" />
            </div>
            <div className="form-group">
              <label htmlFor="editContactEmail">Adres e-mail</label>
              <input type="email" id="editContactEmail" name="contactEmail" placeholder="nazwa@domena.pl" />
            </div>
          </div>

          <div className="form-section">
            <h2>Zdjęcia</h2>
            <p className="form-text">Możliwość przesyłania i usuwania zdjęć zostanie dodana po migracji backendu.</p>
            <div className="gallery-placeholder">
              <i className="fas fa-images" aria-hidden="true" />
              <p>Brak dodanych zdjęć.</p>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled>
            Zapisz zmiany
          </button>
        </form>
      </div>
    </div>
  );
}
