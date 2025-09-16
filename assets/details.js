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
  syncMobileMenu
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
  marker: null
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

function extractPlotNumber(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }
  const text = String(rawValue).trim();
  if (!text) {
    return null;
  }
  const parts = text.split('.');
  const lastPart = parts[parts.length - 1]?.trim();
  return lastPart || text;
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

function enforceReadOnly(element) {
  if (!element) return;

  const applyAttributes = () => {
    if (element.getAttribute('contenteditable') !== 'false') {
      element.setAttribute('contenteditable', 'false');
    }
    if (element.getAttribute('aria-readonly') !== 'true') {
      element.setAttribute('aria-readonly', 'true');
    }
    if (element.hasAttribute('tabindex')) {
      element.removeAttribute('tabindex');
    }
  };

  applyAttributes();

  if (typeof MutationObserver !== 'function') {
    return;
  }

  if (!element.__readOnlyObserver) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'contenteditable') {
          applyAttributes();
        }
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ['contenteditable'] });
    element.__readOnlyObserver = observer;
  }
}

function lockTextValue(element, value) {
  if (!element) return;
  const normalized = value === null || value === undefined ? '' : String(value);
  element.dataset.lockedValue = normalized;
  if (element.textContent !== normalized) {
    element.textContent = normalized;
  }
  if (typeof MutationObserver === 'function' && !element.__lockedValueObserver) {
    const observer = new MutationObserver(() => {
      const locked = element.dataset.lockedValue ?? '';
      if (element.textContent !== locked) {
        element.textContent = locked;
      }
    });
    observer.observe(element, { characterData: true, childList: true, subtree: true });
    element.__lockedValueObserver = observer;
  }
  enforceReadOnly(element);
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
  lockTextValue(elements.propertyArea, text);
  lockTextValue(elements.plotAreaStat, text);
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

  const rawPlotNumber = pickValue(plot.plotNumber, plot.Id, plot.number);
  const formattedPlotNumber = extractPlotNumber(rawPlotNumber);
  setTextContent(elements.plotNumber, formattedPlotNumber, '—');
  lockTextValue(elements.plotNumber, elements.plotNumber.textContent);
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
}

function initializeReadOnlyLocks() {
  lockTextValue(elements.plotNumber, elements.plotNumber?.textContent ?? '—');
  lockTextValue(elements.propertyArea, elements.propertyArea?.textContent ?? '—');
  lockTextValue(elements.plotAreaStat, elements.plotAreaStat?.textContent ?? '—');
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

async function renderMap(plot) {
  if (!elements.mapElement) return;
  const lat = parseFloat(pickValue(plot.lat, plot.latitude, plot.coords?.lat));
  const lng = parseFloat(pickValue(plot.lng, plot.longitude, plot.coords?.lng));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    elements.mapElement.innerHTML = '<p style="padding:1rem;color:var(--gray);">Brak współrzędnych do wyświetlenia mapy.</p>';
    return;
  }
  try {
    await loadGoogleMaps();
  } catch (err) {
    elements.mapElement.innerHTML = '<p style="padding:1rem;color:#c53030;">Nie udało się załadować mapy.</p>';
    return;
  }
  const center = { lat, lng };
  state.map = new google.maps.Map(elements.mapElement, {
    center,
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.HYBRID,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false
  });
  state.marker = new google.maps.Marker({
    map: state.map,
    position: center,
    title: textContentOrFallback(elements.propertyTitle?.textContent, 'Działka')
  });
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

function setupSaveButton() {
  if (!elements.savePlotBtn) return;
  elements.savePlotBtn.addEventListener('click', () => {
    showToast('Funkcja zapisywania działek będzie dostępna wkrótce.', 'info');
  });
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
  initializeReadOnlyLocks();
  setupAuthUI();
  setupMapModeButtons();
  setupInquiryForm();
  setupSaveButton();
  await loadProperty();
}

init();
