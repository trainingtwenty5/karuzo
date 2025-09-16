import {
  initFirebase,
  doc,
  getDoc,
  onAuthStateChanged,
  parseQueryParams,
  formatNumber,
  formatCurrency,
  formatArea,
  formatDateTime,
  normalizeUtilityStatus,
  getUtilityLabel,
  UTILITY_ORDER,
  loadGoogleMaps,
  showToast,
  textContentOrFallback,
  sanitizeMultilineText,
  ensureArray,
  parseNumberFromText,
  syncMobileMenu,
  setDoc
} from './property-common.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const state = {
  user: null,
  offerId: '',
  plotIndex: 0,
  offerData: null,
  plotData: null,
  price: null,
  area: null,
  map: null,
  marker: null,
  polygon: null,
  favorites: [],
  savingFavorite: false
};

const elements = {
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  propertyContent: document.getElementById('propertyContent'),
  propertyTitle: document.getElementById('propertyTitle'),
  propertyLocation: document.getElementById('propertyLocation'),
  propertyArea: document.getElementById('propertyArea'),
  propertyType: document.getElementById('propertyType'),
  ownershipStatus: document.getElementById('ownershipStatus'),
  priceValueText: document.getElementById('priceValueText'),
  pricePerSqm: document.getElementById('pricePerSqm'),
  priceUpdatedAt: document.getElementById('priceUpdatedAt'),
  plotNumber: document.getElementById('plotNumber'),
  landRegister: document.getElementById('landRegister'),
  plotAreaStat: document.getElementById('plotAreaStat'),
  plotStatus: document.getElementById('plotStatus'),
  locationAddress: document.getElementById('locationAddress'),
  locationAccess: document.getElementById('locationAccess'),
  planBadges: document.getElementById('planBadges'),
  planDesignation: document.getElementById('planDesignation'),
  planHeight: document.getElementById('planHeight'),
  planIntensity: document.getElementById('planIntensity'),
  planGreen: document.getElementById('planGreen'),
  planNotes: document.getElementById('planNotes'),
  utilitiesGrid: document.getElementById('utilitiesGrid'),
  descriptionText: document.getElementById('descriptionText'),
  tagsList: document.getElementById('tagsList'),
  tagsEmpty: document.getElementById('tagsEmpty'),
  contactName: document.getElementById('contactName'),
  contactPhoneLink: document.getElementById('contactPhoneLink'),
  contactEmailLink: document.getElementById('contactEmailLink'),
  savePlotBtn: document.getElementById('savePlotBtn'),
  inquiryForm: document.getElementById('inquiryForm'),
  mapSection: document.getElementById('mapSection'),
  mapElement: document.getElementById('propertyMap'),
  mapModeButtons: Array.from(document.querySelectorAll('.map-mode-btn')),
  authButtons: document.getElementById('authButtons'),
  userMenu: document.getElementById('userMenu'),
  loginBtn: document.getElementById('loginBtn'),
  registerBtn: document.getElementById('registerBtn'),
  accountBtn: document.getElementById('accountBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  mobileAuth: document.getElementById('mobileAuth'),
  loginModal: document.getElementById('loginModal'),
  registerModal: document.getElementById('registerModal'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  switchToRegister: document.getElementById('switchToRegister'),
  switchToLogin: document.getElementById('switchToLogin'),
  modalCloseButtons: Array.from(document.querySelectorAll('.modal-close')),
  googleRegisterBtn: document.getElementById('googleLoginBtn'),
  googleLoginBtn: document.getElementById('googleLoginBtnLogin')
};

const MAP_MODES = {
  base: 'hybrid',
  mpzp: 'satellite',
  studium: 'terrain'
};

function pickValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }
    return value;
  }
  return null;
}

function formatPrice(value) {
  const formatted = formatCurrency(value);
  return formatted ? `${formatted}` : '—';
}

function formatPerSqm(price, area) {
  if (!Number.isFinite(price) || !Number.isFinite(area) || area <= 0) {
    return '—';
  }
  const result = Math.round(price / area);
  const formatted = formatNumber(result);
  return formatted ? `${formatted} zł/m²` : '—';
}

function formatAreaText(value) {
  const formatted = formatArea(value);
  return formatted ? formatted : '—';
}

function setTextContent(element, value, fallback = '—') {
  if (!element) return;
  element.textContent = textContentOrFallback(value, fallback);
}

function setMultilineText(element, value, fallback = '—') {
  if (!element) return;
  const text = value === null || value === undefined || value === ''
    ? fallback
    : sanitizeMultilineText(value);
  element.textContent = text;
}

function formatPhoneNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 9) {
    const core = digits.slice(-9);
    return `+48 ${core.slice(0,3)}-${core.slice(3,6)}-${core.slice(6)}`;
  }
  return digits;
}

function setContactLink(anchor, value, type) {
  if (!anchor) return;
  if (!value) {
    anchor.textContent = type === 'phone' ? 'Brak numeru' : 'Brak adresu';
    anchor.setAttribute('href', '#');
    return;
  }
  const text = type === 'phone' ? formatPhoneNumber(value) : value.trim();
  anchor.textContent = text || (type === 'phone' ? 'Brak numeru' : 'Brak adresu');
  if (!text) {
    anchor.setAttribute('href', '#');
    return;
  }
  if (type === 'phone') {
    const digits = String(value).replace(/\D/g, '');
    anchor.setAttribute('href', digits ? `tel:${digits}` : '#');
  } else {
    anchor.setAttribute('href', `mailto:${text}`);
  }
}

function renderPlanBadges(badges) {
  if (!elements.planBadges) return;
  const list = ensureArray(badges).map(badge => typeof badge === 'string' ? badge.trim() : badge?.label).filter(Boolean);
  elements.planBadges.innerHTML = '';
  if (!list.length) {
    const chip = document.createElement('span');
    chip.className = 'plan-badge';
    chip.textContent = 'Brak oznaczeń';
    elements.planBadges.appendChild(chip);
    return;
  }
  list.forEach(text => {
    const chip = document.createElement('span');
    chip.className = 'plan-badge';
    chip.textContent = text;
    elements.planBadges.appendChild(chip);
  });
}

function renderTags(tags) {
  if (!elements.tagsList || !elements.tagsEmpty) return;
  elements.tagsList.innerHTML = '';
  const list = ensureArray(tags)
    .map(tag => typeof tag === 'string' ? tag.trim() : '')
    .filter(Boolean);
  if (!list.length) {
    elements.tagsEmpty.hidden = false;
    return;
  }
  elements.tagsEmpty.hidden = true;
  list.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = tag;
    elements.tagsList.appendChild(chip);
  });
}

function renderUtilities(utilities) {
  if (!elements.utilitiesGrid) return;
  const source = utilities && typeof utilities === 'object' ? utilities : {};
  const cards = Array.from(elements.utilitiesGrid.querySelectorAll('.utility-card'));
  cards.forEach(card => {
    const key = card.dataset.utility;
    const rawStatus = source[key];
    const status = normalizeUtilityStatus(rawStatus);
    card.dataset.status = status;
    const label = card.querySelector('.utility-status');
    if (label) {
      label.textContent = getUtilityLabel(status, 'details');
    }
  });
}

function setPrice(price) {
  state.price = Number.isFinite(price) ? price : null;
  elements.priceValueText.textContent = formatPrice(state.price);
}

function setArea(area) {
  state.area = Number.isFinite(area) ? area : null;
  const text = formatAreaText(state.area);
  elements.propertyArea.textContent = text;
  elements.plotAreaStat.textContent = text;
}

function renderPriceMetadata(priceUpdatedAt) {
  const formatted = formatDateTime(priceUpdatedAt);
  elements.priceUpdatedAt.textContent = formatted ? `Aktualizacja: ${formatted}` : 'Aktualizacja: —';
  elements.pricePerSqm.textContent = formatPerSqm(state.price, state.area);
}

function showContent() {
  elements.loadingState?.classList.add('hidden');
  elements.errorState?.classList.add('hidden');
  elements.propertyContent?.classList.remove('hidden');
}

function showError(message) {
  elements.loadingState?.classList.add('hidden');
  if (elements.errorState) {
    elements.errorState.textContent = message;
    elements.errorState.classList.remove('hidden');
  }
  state.offerData = null;
  state.plotData = null;
  updateSaveButtonState();
}

function mergeUtilities(dataUtilities, plotUtilities) {
  const base = {};
  const assignUtilities = (source) => {
    if (!source) return;
    if (Array.isArray(source)) {
      source.forEach(item => {
        if (typeof item === 'string') {
          base[item] = 'available';
        } else if (item && typeof item === 'object' && item.type) {
          base[item.type] = item.status || item.value || item.available;
        }
      });
      return;
    }
    Object.entries(source).forEach(([key, value]) => {
      base[key] = value;
    });
  };
  assignUtilities(dataUtilities);
  assignUtilities(plotUtilities);
  return base;
}

function renderOffer(data, plot) {
  const title = pickValue(plot.title, plot.name, plot.Id, `Działka ${state.plotIndex + 1}`);
  elements.propertyTitle.textContent = textContentOrFallback(title, 'Działka');
  document.title = `Grunteo - ${textContentOrFallback(title, 'Działka')}`;

  const location = pickValue(plot.location, plot.city, data.city, data.location, 'Polska');
  setTextContent(elements.propertyLocation, location, 'Polska');

  const propertyType = pickValue(plot.propertyType, plot.type, data.propertyType, 'Rodzaj');
  setTextContent(elements.propertyType, propertyType, 'Rodzaj');

  const ownership = pickValue(plot.ownershipStatus, plot.ownership, data.ownershipStatus, 'Własność');
  setTextContent(elements.ownershipStatus, ownership, 'Własność');

  const priceRaw = pickValue(plot.price, data.price);
  const price = parseNumberFromText(priceRaw);
  setPrice(price);

  const areaRaw = pickValue(plot.pow_dzialki_m2_uldk, plot.area, plot.surface, data.area);
  const area = parseNumberFromText(areaRaw);
  setArea(area);

  renderPriceMetadata(pickValue(plot.priceUpdatedAt, data.updatedAt, data.timestamp));

  setTextContent(elements.plotNumber, pickValue(plot.plotNumber, plot.Id, plot.number), '—');
  setTextContent(elements.landRegister, pickValue(plot.landRegister, plot.kwNumber, plot.landRegistry, plot.numer_kw), '—');
  setTextContent(elements.plotStatus, pickValue(plot.status, plot.offerStatus, data.status), '—');

  setMultilineText(elements.locationAddress, pickValue(plot.locationAddress, data.address, plot.address), 'Dodaj adres działki');
  setMultilineText(elements.locationAccess, pickValue(plot.locationAccess, plot.access, data.access), 'Opisz komunikację, dostęp do drogi, najbliższe punkty orientacyjne.');

  renderPlanBadges(pickValue(plot.planBadges, data.planBadges));
  setTextContent(elements.planDesignation, pickValue(plot.planDesignation, plot.planUsage, data.planDesignation), 'Brak informacji');
  setTextContent(elements.planHeight, pickValue(plot.planHeight, data.planHeight), '—');
  setTextContent(elements.planIntensity, pickValue(plot.planIntensity, data.planIntensity), '—');
  setTextContent(elements.planGreen, pickValue(plot.planGreen, data.planGreen), '—');
  setMultilineText(elements.planNotes, pickValue(plot.planNotes, data.planNotes), 'Uzupełnij najważniejsze zapisy z planu miejscowego lub studium.');

  const utilities = mergeUtilities(data.utilities, plot.utilities);
  renderUtilities(utilities);

  setMultilineText(elements.descriptionText, pickValue(plot.description, data.description), 'Brak opisu');

  renderTags(pickValue(plot.tags, data.tags));

  const contactName = pickValue(plot.contactName, data.contactName, data.firstName, 'Właściciel');
  setTextContent(elements.contactName, contactName, 'Właściciel');

  const phone = pickValue(plot.contactPhone, data.contactPhone, data.phone);
  setContactLink(elements.contactPhoneLink, phone, 'phone');

  const email = pickValue(plot.contactEmail, data.contactEmail, data.email);
  setContactLink(elements.contactEmailLink, email, 'email');

  updateSaveButtonState();
}

function setMapMode(mode) {
  if (!state.map) return;
  const type = MAP_MODES[mode] || MAP_MODES.base;
  state.map.setMapTypeId(type === 'hybrid'
    ? google.maps.MapTypeId.HYBRID
    : type === 'satellite'
      ? google.maps.MapTypeId.SATELLITE
      : google.maps.MapTypeId.TERRAIN);
}

function setupMapModeButtons() {
  elements.mapModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      elements.mapModeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setMapMode(btn.dataset.mode);
    });
  });
}

function ensureProjDefinition() {
  if (typeof proj4 === 'undefined' || typeof proj4.defs !== 'function') {
    console.warn('Proj4 nie jest dostępne - granice działki nie będą pokazane.');
    return false;
  }
  if (!proj4.defs('EPSG:2180')) {
    proj4.defs('EPSG:2180', '+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +units=m +no_defs');
  }
  return true;
}

function parsePlotGeometry(geometryString) {
  if (!geometryString || typeof geometryString !== 'string') return [];
  if (!ensureProjDefinition()) return [];
  const coords = [];
  try {
    const match = geometryString.match(/\(\(([^)]+)\)\)/);
    const coordString = match ? match[1] : '';
    if (!coordString) return [];
    const points = coordString.split(',');
    points.forEach(point => {
      const parts = point.trim().split(/\s+/);
      if (parts.length < 2) return;
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const [lng, lat] = proj4('EPSG:2180', 'WGS84', [x, y]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coords.push({ lat, lng });
      }
    });
  } catch (error) {
    console.error('Nie udało się przetworzyć geometrii działki.', error);
  }
  return coords;
}

function computePolygonCenter(coords) {
  if (!coords.length) return null;
  const total = coords.reduce((acc, point) => {
    acc.lat += point.lat;
    acc.lng += point.lng;
    return acc;
  }, { lat: 0, lng: 0 });
  return {
    lat: total.lat / coords.length,
    lng: total.lng / coords.length
  };
}

async function renderMap(plot) {
  if (!elements.mapElement) return;
  const lat = parseFloat(pickValue(plot.lat, plot.latitude, plot.coords?.lat));
  const lng = parseFloat(pickValue(plot.lng, plot.longitude, plot.coords?.lng));
  const geometryRaw = pickValue(
    plot.geometry_uldk_wkt,
    plot.geometry_uldk?.wkt,
    plot.geometry_uldk,
    plot.geometry,
    plot.geometryWkt,
    plot.geometry_wkt
  );
  const geometryCoords = typeof geometryRaw === 'string' ? parsePlotGeometry(geometryRaw) : [];
  const hasLatLng = Number.isFinite(lat) && Number.isFinite(lng);
  if (!hasLatLng && !geometryCoords.length) {
    elements.mapElement.innerHTML = '<p style="padding:1rem;color:var(--gray);">Brak współrzędnych do wyświetlenia mapy.</p>';
    return;
  }
  try {
    await loadGoogleMaps();
  } catch (err) {
    elements.mapElement.innerHTML = '<p style="padding:1rem;color:#c53030;">Nie udało się załadować mapy.</p>';
    return;
  }
  const title = textContentOrFallback(elements.propertyTitle?.textContent, 'Działka');
  const geometryCenter = geometryCoords.length ? computePolygonCenter(geometryCoords) : null;
  const center = hasLatLng ? { lat, lng } : (geometryCenter || geometryCoords[0]);
  if (!center) {
    elements.mapElement.innerHTML = '<p style="padding:1rem;color:var(--gray);">Brak współrzędnych do wyświetlenia mapy.</p>';
    return;
  }

  if (state.marker) {
    state.marker.setMap(null);
    state.marker = null;
  }
  if (state.polygon) {
    state.polygon.setMap(null);
    state.polygon = null;
  }

  elements.mapElement.innerHTML = '';
  state.map = new google.maps.Map(elements.mapElement, {
    center,
    zoom: hasLatLng ? 15 : 16,
    mapTypeId: google.maps.MapTypeId.HYBRID,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false
  });
  state.marker = new google.maps.Marker({
    map: state.map,
    position: center,
    title
  });
  if (geometryCoords.length) {
    state.polygon = new google.maps.Polygon({
      paths: geometryCoords,
      strokeColor: '#ff3b30',
      strokeOpacity: 0.95,
      strokeWeight: 3,
      fillColor: '#ff3b30',
      fillOpacity: 0.18,
      map: state.map,
      clickable: false
    });
    const bounds = new google.maps.LatLngBounds();
    geometryCoords.forEach(coord => bounds.extend(coord));
    if (typeof bounds.isEmpty !== 'function' || !bounds.isEmpty()) {
      state.map.fitBounds(bounds, { top: 32, right: 32, bottom: 32, left: 32 });
    }
  }
}

function setupInquiryForm() {
  if (!elements.inquiryForm) return;
  elements.inquiryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.inquiryName?.value?.trim();
    const email = form.inquiryEmail?.value?.trim();
    const message = form.inquiryMessage?.value?.trim();
    if (!name || !email || !message) {
      showToast('Uzupełnij wszystkie pola formularza.', 'warning');
      return;
    }
    showToast('Wiadomość została wysłana. Skontaktujemy się wkrótce.', 'success');
    form.reset();
  });
}

function collectUnique(values) {
  return Array.from(new Set(values.filter(Boolean).map(value => String(value))));
}

function getOwnerIdentifiers() {
  const offer = state.offerData || {};
  const plot = state.plotData || {};
  const ownerUids = collectUnique([
    plot.ownerUid,
    plot.ownerId,
    plot.userUid,
    plot.createdBy,
    offer.ownerUid,
    offer.userUid,
    offer.uid,
    offer.ownerId,
    offer.createdBy
  ]);
  const ownerEmails = collectUnique([
    plot.ownerEmail,
    plot.contactEmail,
    offer.ownerEmail,
    offer.userEmail,
    offer.email,
    offer.contactEmail
  ]).map(value => value.toLowerCase());
  return { ownerUids, ownerEmails };
}

function isPlotOwnedByCurrentUser() {
  if (!state.user) return false;
  const { ownerUids, ownerEmails } = getOwnerIdentifiers();
  const userUid = state.user.uid ? String(state.user.uid) : '';
  const userEmail = state.user.email ? String(state.user.email).toLowerCase() : '';
  if (userUid && ownerUids.includes(userUid)) return true;
  if (userEmail && ownerEmails.includes(userEmail)) return true;
  return false;
}

function isCurrentPlotFavorite() {
  if (!state.offerId && state.plotIndex === undefined) return false;
  return state.favorites.some(item => item && item.offerId === state.offerId && item.plotIndex === state.plotIndex);
}

function updateSaveButtonState() {
  const btn = elements.savePlotBtn;
  if (!btn) return;

  btn.classList.remove('is-disabled', 'is-saved');
  btn.removeAttribute('aria-pressed');
  btn.disabled = false;

  if (!state.offerData || !state.plotData) {
    btn.classList.add('is-disabled');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-bookmark"></i> Ładowanie...';
    return;
  }

  if (!state.user) {
    btn.innerHTML = '<i class="far fa-bookmark"></i> Zapisz działkę';
    return;
  }

  if (isPlotOwnedByCurrentUser()) {
    btn.classList.add('is-disabled');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-user"></i> To Twoja oferta';
    return;
  }

  if (state.savingFavorite) {
    btn.classList.add('is-disabled');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
    return;
  }

  if (isCurrentPlotFavorite()) {
    btn.classList.add('is-saved');
    btn.setAttribute('aria-pressed', 'true');
    btn.innerHTML = '<i class="fas fa-bookmark"></i> Dodano do ulubionych';
  } else {
    btn.innerHTML = '<i class="far fa-bookmark"></i> Zapisz działkę';
  }
}

async function loadUserFavorites(user) {
  if (!user) {
    state.favorites = [];
    updateSaveButtonState();
    return;
  }
  const { db } = initFirebase();
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const data = snap.exists() ? snap.data() : {};
    const favorites = Array.isArray(data.favorites) ? data.favorites : [];
    state.favorites = favorites;
  } catch (error) {
    console.error('loadUserFavorites', error);
    state.favorites = [];
  }
  updateSaveButtonState();
}

function buildFavoriteEntry() {
  const plot = state.plotData || {};
  const offer = state.offerData || {};
  const title = textContentOrFallback(
    pickValue(plot.title, plot.name, plot.Id, offer.title, `Działka ${state.plotIndex + 1}`),
    `Działka ${state.plotIndex + 1}`
  );
  const city = pickValue(plot.location, plot.city, offer.city, offer.location);
  const priceValue = parseNumberFromText(pickValue(plot.price, offer.price));
  const areaValue = parseNumberFromText(pickValue(plot.pow_dzialki_m2_uldk, plot.area, plot.surface, offer.area));
  const contactName = pickValue(plot.contactName, offer.contactName, offer.firstName);
  const contactPhone = pickValue(plot.contactPhone, offer.contactPhone, offer.phone);
  const contactEmail = pickValue(plot.contactEmail, offer.contactEmail, offer.email);
  const ownerUid = pickValue(plot.ownerUid, plot.ownerId, plot.userUid, offer.ownerUid, offer.userUid, offer.uid, offer.ownerId, offer.createdBy);
  const ownerEmail = pickValue(plot.ownerEmail, offer.ownerEmail, offer.userEmail, offer.email);
  const plotNumber = pickValue(plot.plotNumber, plot.Id, plot.number);

  return {
    offerId: state.offerId,
    plotIndex: state.plotIndex,
    title,
    city: city ? String(city).trim() : null,
    price: Number.isFinite(priceValue) ? priceValue : null,
    area: Number.isFinite(areaValue) ? areaValue : null,
    ownerUid: ownerUid ? String(ownerUid) : null,
    ownerEmail: ownerEmail ? String(ownerEmail).trim() : null,
    contactName: contactName ? String(contactName).trim() : null,
    contactPhone: contactPhone ? String(contactPhone).trim() : null,
    contactEmail: contactEmail ? String(contactEmail).trim() : null,
    plotNumber: plotNumber ? String(plotNumber).trim() : null,
    savedAt: Date.now()
  };
}

async function handleSaveFavorite() {
  if (!elements.savePlotBtn) return;
  if (!state.user) {
    showToast('Zaloguj się, aby zapisać działkę do ulubionych.', 'info');
    openModal(elements.loginModal);
    return;
  }
  if (!state.offerData || !state.plotData) {
    showToast('Poczekaj aż działka zostanie wczytana.', 'warning');
    return;
  }
  if (isPlotOwnedByCurrentUser()) {
    showToast('To Twoja oferta – znajdziesz ją w sekcji „Moje oferty”.', 'info');
    return;
  }
  if (state.savingFavorite) {
    return;
  }

  state.savingFavorite = true;
  updateSaveButtonState();

  const { db } = initFirebase();
  const userRef = doc(db, 'users', state.user.uid);
  try {
    const snap = await getDoc(userRef);
    const data = snap.exists() ? snap.data() : {};
    const favorites = Array.isArray(data.favorites) ? data.favorites : [];
    state.favorites = favorites;

    if (isCurrentPlotFavorite()) {
      showToast('Ta działka jest już na liście ulubionych.', 'info');
      return;
    }

    const entry = buildFavoriteEntry();
    const updatedFavorites = [...favorites, entry];
    await setDoc(userRef, { favorites: updatedFavorites }, { merge: true });
    state.favorites = updatedFavorites;
    showToast('Dodano działkę do ulubionych.', 'success');
  } catch (error) {
    console.error('handleSaveFavorite', error);
    showToast('Nie udało się zapisać działki. Spróbuj ponownie.', 'error');
  } finally {
    state.savingFavorite = false;
    updateSaveButtonState();
  }
}

function setupSaveButton() {
  if (!elements.savePlotBtn) return;
  elements.savePlotBtn.addEventListener('click', () => {
    handleSaveFavorite();
  });
  updateSaveButtonState();
}

function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
}

function closeModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
}

function setupModalHandlers() {
  elements.modalCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
      closeModal(button.closest('.modal'));
    });
  });
  [elements.loginModal, elements.registerModal].forEach(modal => {
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });
}

function updateAuthUI(user) {
  state.user = user;
  if (elements.authButtons) {
    elements.authButtons.style.display = user ? 'none' : 'flex';
  }
  if (elements.userMenu) {
    elements.userMenu.style.display = user ? 'flex' : 'none';
  }

  if (elements.mobileAuth) {
    if (user) {
      const label = user.displayName ? user.displayName.split(' ')[0] : (user.email || 'Konto');
      elements.mobileAuth.innerHTML = `
        <div class="nav-link" style="font-weight:600;"><i class="fas fa-user"></i> ${label}</div>
        <a href="index.html#userDashboard" class="nav-link" id="mobileAccountLink">Moje konto</a>
        <button class="btn btn-secondary" id="mobileLogoutBtn" style="width:100%;"><i class="fas fa-sign-out-alt"></i> Wyloguj</button>
      `;
      const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
      mobileLogoutBtn?.addEventListener('click', () => performLogout());
      const mobileAccountLink = document.getElementById('mobileAccountLink');
      mobileAccountLink?.addEventListener('click', () => {
        window.location.href = 'index.html#userDashboard';
      });
    } else {
      elements.mobileAuth.innerHTML = `
        <button class="btn btn-outline-primary btn-sm" id="mobileLoginBtn" style="width:100%;margin-bottom:.5rem;">
          <i class="fas fa-sign-in-alt"></i> Zaloguj się
        </button>
        <button class="btn btn-primary btn-sm" id="mobileRegisterBtn" style="width:100%;">
          <i class="fas fa-user-plus"></i> Zarejestruj się
        </button>
      `;
      document.getElementById('mobileLoginBtn')?.addEventListener('click', () => openModal(elements.loginModal));
      document.getElementById('mobileRegisterBtn')?.addEventListener('click', () => openModal(elements.registerModal));
    }
  }

  if (user) {
    loadUserFavorites(user);
  } else {
    state.favorites = [];
    updateSaveButtonState();
  }
}

async function performLogout() {
  try {
    const { auth } = initFirebase();
    await signOut(auth);
    showToast('Wylogowano pomyślnie.', 'success');
  } catch (error) {
    showToast('Nie udało się wylogować. Spróbuj ponownie.', 'error');
  }
}

function setupAuthUI() {
  const { auth } = initFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', () => openModal(elements.loginModal));
  }
  if (elements.registerBtn) {
    elements.registerBtn.addEventListener('click', () => openModal(elements.registerModal));
  }
  if (elements.accountBtn) {
    elements.accountBtn.addEventListener('click', () => {
      window.location.href = 'index.html#userDashboard';
    });
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => performLogout());
  }
  setupModalHandlers();

  elements.switchToRegister?.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal(elements.loginModal);
    openModal(elements.registerModal);
  });
  elements.switchToLogin?.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal(elements.registerModal);
    openModal(elements.loginModal);
  });

  elements.loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = event.target.loginEmail?.value?.trim();
    const password = event.target.loginPassword?.value;
    if (!email || !password) {
      showToast('Podaj adres email i hasło.', 'warning');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Zalogowano pomyślnie.', 'success');
      closeModal(elements.loginModal);
      event.target.reset();
    } catch (error) {
      showToast('Nie udało się zalogować: ' + (error.message || ''), 'error');
    }
  });

  elements.registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = event.target.registerEmail?.value?.trim();
    const password = event.target.registerPassword?.value;
    if (!email || !password) {
      showToast('Podaj adres email i hasło.', 'warning');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showToast('Konto zostało utworzone.', 'success');
      closeModal(elements.registerModal);
      event.target.reset();
    } catch (error) {
      showToast('Nie udało się utworzyć konta: ' + (error.message || ''), 'error');
    }
  });

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      showToast('Zalogowano przez Google.', 'success');
      closeModal(elements.loginModal);
      closeModal(elements.registerModal);
    } catch (error) {
      showToast('Nie udało się zalogować przez Google.', 'error');
    }
  };

  elements.googleRegisterBtn?.addEventListener('click', handleGoogleLogin);
  elements.googleLoginBtn?.addEventListener('click', handleGoogleLogin);

  onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
  });
}

async function loadProperty() {
  if (!state.offerId) {
    showError('Nie wskazano identyfikatora oferty.');
    return;
  }
  const { db } = initFirebase();
  try {
    const offerRef = doc(db, 'propertyListings', state.offerId);
    const snap = await getDoc(offerRef);
    if (!snap.exists()) {
      showError('Ogłoszenie nie istnieje lub zostało usunięte.');
      return;
    }
    const data = snap.data();
    const plots = Array.isArray(data.plots) ? data.plots : [];
    const plot = plots[state.plotIndex];
    if (!plot) {
      showError('Nie odnaleziono wskazanej działki.');
      return;
    }
    state.offerData = data;
    state.plotData = plot;
    renderOffer(data, plot);
    await renderMap(plot);
    showContent();
  } catch (error) {
    console.error('loadProperty', error);
    showError('Wystąpił błąd podczas ładowania danych działki.');
  }
}

async function init() {
  syncMobileMenu();
  const { offerId, plotIndex } = parseQueryParams();
  state.offerId = offerId;
  state.plotIndex = plotIndex;
  initFirebase();
  setupAuthUI();
  setupMapModeButtons();
  setupInquiryForm();
  setupSaveButton();
  await loadProperty();
}

init();
