import {
  initFirebase,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
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
  cloneDeep,
  stripHtml,
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
  utilities: {},
  tags: [],
  price: null,
  area: null,
  saving: false,
  planBadges: null,
  map: null,
  marker: null,
  hasLoaded: false
};

const elements = {
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  propertyContent: document.getElementById('propertyContent'),
  saveChangesBtn: document.getElementById('saveChangesBtn'),
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
  tagInput: document.getElementById('tagInput'),
  addTagBtn: document.getElementById('addTagBtn'),
  contactName: document.getElementById('contactName'),
  contactPhoneLink: document.getElementById('contactPhoneLink'),
  contactEmailLink: document.getElementById('contactEmailLink'),
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

function formatPerSqm(price, area) {
  if (!Number.isFinite(price) || !Number.isFinite(area) || area <= 0) {
    return '—';
  }
  const ppm = Math.round(price / area);
  const formatted = formatNumber(ppm);
  return formatted ? `${formatted} zł/m²` : '—';
}

function formatPrice(value) {
  const formatted = formatCurrency(value);
  return formatted ? `${formatted}` : '—';
}

function formatAreaText(value) {
  const formatted = formatArea(value);
  return formatted ? formatted : '—';
}

function setPriceEdit(price) {
  state.price = Number.isFinite(price) ? price : null;
  elements.priceValueText.textContent = formatPrice(state.price);
  updatePricePerSqm();
}

let updatingArea = false;
function setAreaEdit(area) {
  state.area = Number.isFinite(area) ? area : null;
  updateAreaDisplay();
  updatePricePerSqm();
}

function updateAreaDisplay() {
  const text = formatAreaText(state.area);
  updatingArea = true;
  elements.propertyArea.textContent = text;
  elements.plotAreaStat.textContent = text;
  updatingArea = false;
}

function updatePricePerSqm() {
  elements.pricePerSqm.textContent = formatPerSqm(state.price, state.area);
}

function renderPriceUpdatedAt(value) {
  const formatted = formatDateTime(value);
  elements.priceUpdatedAt.textContent = formatted ? `Aktualizacja: ${formatted}` : 'Aktualizacja: —';
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

function updateContactPhoneHref() {
  if (!elements.contactPhoneLink) return;
  const raw = stripHtml(elements.contactPhoneLink.innerHTML).trim();
  const digits = raw.replace(/\D/g, '');
  elements.contactPhoneLink.href = digits ? `tel:${digits}` : '#';
}

function updateContactEmailHref() {
  if (!elements.contactEmailLink) return;
  const raw = stripHtml(elements.contactEmailLink.innerHTML).trim();
  elements.contactEmailLink.href = raw ? `mailto:${raw}` : '#';
}

function renderPlanBadges(badges) {
  if (!elements.planBadges) return;
  elements.planBadges.innerHTML = '';
  const list = ensureArray(badges)
    .map(item => typeof item === 'string' ? item.trim() : item?.label)
    .filter(Boolean);
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

function mergeUtilities(dataUtilities, plotUtilities) {
  const base = {};
  const assign = (source) => {
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
  assign(dataUtilities);
  assign(plotUtilities);
  return base;
}

function renderUtilitiesEdit() {
  if (!elements.utilitiesGrid) return;
  const cards = Array.from(elements.utilitiesGrid.querySelectorAll('.utility-card'));
  cards.forEach(card => {
    const key = card.dataset.utility;
    const status = normalizeUtilityStatus(state.utilities[key]);
    state.utilities[key] = status;
    card.dataset.status = status;
    const label = card.querySelector('.utility-status');
    if (label) {
      label.textContent = getUtilityLabel(status, 'edit');
    }
  });
}

function renderTagsEdit() {
  if (!elements.tagsList || !elements.tagsEmpty) return;
  elements.tagsList.innerHTML = '';
  if (!state.tags.length) {
    elements.tagsEmpty.hidden = false;
    return;
  }
  elements.tagsEmpty.hidden = true;
  state.tags.forEach((tag, index) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip removable';
    chip.innerHTML = `<span>${tag}</span><button type="button" class="tag-remove" data-index="${index}" aria-label="Usuń znacznik">&times;</button>`;
    elements.tagsList.appendChild(chip);
  });
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
  elements.propertyContent?.classList.add('hidden');
}

function redirectToDetails() {
  const url = `details.html?id=${encodeURIComponent(state.offerId)}&plot=${state.plotIndex}`;
  window.location.replace(url);
}

function selectAllText(element) {
  if (!element) return;
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function preventNewline(element) {
  element?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  });
}

function attachEditorListeners() {
  if (elements.priceValueText) {
    elements.priceValueText.addEventListener('focus', () => {
      if (state.price !== null) {
        elements.priceValueText.textContent = String(state.price);
        selectAllText(elements.priceValueText);
      } else {
        elements.priceValueText.textContent = '';
      }
    });
    elements.priceValueText.addEventListener('input', () => {
      const value = parseNumberFromText(elements.priceValueText.textContent);
      state.price = Number.isFinite(value) ? value : null;
      updatePricePerSqm();
    });
    elements.priceValueText.addEventListener('blur', () => {
      const value = parseNumberFromText(elements.priceValueText.textContent);
      state.price = Number.isFinite(value) ? value : null;
      elements.priceValueText.textContent = formatPrice(state.price);
      updatePricePerSqm();
    });
  }

  const handleAreaFocus = (element) => {
    element.addEventListener('focus', () => {
      if (state.area !== null) {
        element.textContent = String(state.area);
        selectAllText(element);
      } else {
        element.textContent = '';
      }
    });
  };

  const handleAreaBlur = (element) => {
    element.addEventListener('blur', () => {
      const value = parseNumberFromText(element.textContent);
      state.area = Number.isFinite(value) ? value : null;
      updateAreaDisplay();
      updatePricePerSqm();
    });
  };

  const handleAreaInput = (element) => {
    element.addEventListener('input', () => {
      if (updatingArea) return;
      const value = parseNumberFromText(element.textContent);
      state.area = Number.isFinite(value) ? value : null;
      updatePricePerSqm();
    });
  };

  [elements.propertyArea, elements.plotAreaStat].forEach(element => {
    if (!element) return;
    handleAreaFocus(element);
    handleAreaBlur(element);
    handleAreaInput(element);
  });

  [
    elements.propertyTitle,
    elements.propertyLocation,
    elements.propertyType,
    elements.ownershipStatus,
    elements.plotNumber,
    elements.landRegister,
    elements.plotStatus,
    elements.planDesignation,
    elements.planHeight,
    elements.planIntensity,
    elements.planGreen,
    elements.contactName,
    elements.contactPhoneLink,
    elements.contactEmailLink
  ].forEach(element => {
    preventNewline(element);
    element?.addEventListener('blur', () => {
      const text = stripHtml(element.innerHTML).trim();
      element.textContent = text;
      if (element === elements.contactPhoneLink) {
        updateContactPhoneHref();
      }
      if (element === elements.contactEmailLink) {
        updateContactEmailHref();
      }
    });
  });

  elements.contactPhoneLink?.addEventListener('input', () => {
    const formatted = formatPhoneNumber(stripHtml(elements.contactPhoneLink.innerHTML));
    if (formatted) {
      elements.contactPhoneLink.textContent = formatted;
      selectAllText(elements.contactPhoneLink);
    }
  });

  elements.utilitiesGrid?.addEventListener('click', (event) => {
    const card = event.target.closest('.utility-card');
    if (!card) return;
    const key = card.dataset.utility;
    const current = card.dataset.status || 'missing';
    const index = UTILITY_ORDER.indexOf(current);
    const next = UTILITY_ORDER[(index + 1) % UTILITY_ORDER.length];
    card.dataset.status = next;
    const label = card.querySelector('.utility-status');
    if (label) {
      label.textContent = getUtilityLabel(next, 'edit');
    }
    state.utilities[key] = next;
  });

  elements.addTagBtn?.addEventListener('click', () => {
    addTag(elements.tagInput?.value || '');
  });

  elements.tagInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag(elements.tagInput.value || '');
    }
  });

  elements.tagsList?.addEventListener('click', (event) => {
    const button = event.target.closest('.tag-remove');
    if (!button) return;
    const index = Number.parseInt(button.dataset.index, 10);
    if (Number.isInteger(index)) {
      state.tags.splice(index, 1);
      renderTagsEdit();
    }
  });
}

function addTag(rawValue) {
  const value = (rawValue || '').trim();
  if (!value) {
    showToast('Podaj treść znacznika.', 'warning');
    return;
  }
  const tag = value.startsWith('#') ? value : `#${value}`;
  if (state.tags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
    showToast('Taki znacznik już istnieje.', 'info');
    if (elements.tagInput) elements.tagInput.value = '';
    return;
  }
  state.tags.push(tag);
  renderTagsEdit();
  if (elements.tagInput) elements.tagInput.value = '';
}

function renderEditor(data, plot) {
  const rebind = !!state.plotData;
  state.offerData = data;
  state.plotData = cloneDeep(plot);

  const title = pickValue(plot.title, plot.name, plot.Id, `Działka ${state.plotIndex + 1}`);
  elements.propertyTitle.textContent = textContentOrFallback(title, 'Działka');
  document.title = `Edycja działki - ${textContentOrFallback(title, 'Działka')}`;

  const location = pickValue(plot.location, plot.city, data.city, data.location, 'Polska');
  elements.propertyLocation.textContent = textContentOrFallback(location, 'Polska');

  const propertyType = pickValue(plot.propertyType, plot.type, data.propertyType, 'Rodzaj');
  elements.propertyType.textContent = textContentOrFallback(propertyType, 'Rodzaj');

  const ownership = pickValue(plot.ownershipStatus, plot.ownership, data.ownershipStatus, 'Własność');
  elements.ownershipStatus.textContent = textContentOrFallback(ownership, 'Własność');

  const price = parseNumberFromText(pickValue(plot.price, data.price));
  setPriceEdit(price);

  const area = parseNumberFromText(pickValue(plot.pow_dzialki_m2_uldk, plot.area, data.area));
  setAreaEdit(area);

  renderPriceUpdatedAt(pickValue(plot.priceUpdatedAt, data.updatedAt, data.timestamp));

  elements.plotNumber.textContent = textContentOrFallback(pickValue(plot.plotNumber, plot.Id, plot.number), '—');
  elements.landRegister.textContent = textContentOrFallback(pickValue(plot.landRegister, plot.kwNumber, plot.landRegistry, plot.numer_kw), '—');
  elements.plotStatus.textContent = textContentOrFallback(pickValue(plot.status, plot.offerStatus, data.status), '—');

  elements.locationAddress.textContent = sanitizeMultilineText(pickValue(plot.locationAddress, data.address, plot.address) || '');
  elements.locationAccess.textContent = sanitizeMultilineText(pickValue(plot.locationAccess, plot.access, data.access) || '');

  state.planBadges = cloneDeep(pickValue(plot.planBadges, data.planBadges));
  renderPlanBadges(state.planBadges);
  elements.planDesignation.textContent = textContentOrFallback(pickValue(plot.planDesignation, plot.planUsage, data.planDesignation), 'Brak informacji');
  elements.planHeight.textContent = textContentOrFallback(pickValue(plot.planHeight, data.planHeight), '—');
  elements.planIntensity.textContent = textContentOrFallback(pickValue(plot.planIntensity, data.planIntensity), '—');
  elements.planGreen.textContent = textContentOrFallback(pickValue(plot.planGreen, data.planGreen), '—');
  elements.planNotes.textContent = sanitizeMultilineText(pickValue(plot.planNotes, data.planNotes) || '');

  state.utilities = mergeUtilities(data.utilities, plot.utilities);
  renderUtilitiesEdit();

  elements.descriptionText.textContent = sanitizeMultilineText(pickValue(plot.description, data.description) || '');

  state.tags = ensureArray(pickValue(plot.tags, data.tags))
    .map(tag => typeof tag === 'string' ? tag.trim() : '')
    .filter(Boolean);
  renderTagsEdit();

  const contactName = pickValue(plot.contactName, data.contactName, data.firstName, 'Właściciel');
  elements.contactName.textContent = textContentOrFallback(contactName, 'Właściciel');

  const phone = pickValue(plot.contactPhone, data.contactPhone, data.phone);
  if (phone) {
    elements.contactPhoneLink.textContent = formatPhoneNumber(phone);
  } else {
    elements.contactPhoneLink.textContent = 'Brak numeru';
  }
  updateContactPhoneHref();

  const email = pickValue(plot.contactEmail, data.contactEmail, data.email);
  elements.contactEmailLink.textContent = textContentOrFallback(email, 'Brak adresu');
  updateContactEmailHref();

  if (!rebind) {
    attachEditorListeners();
  }
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

function setMapMode(mode) {
  if (!state.map) return;
  const type = MAP_MODES[mode] || MAP_MODES.base;
  state.map.setMapTypeId(type === 'hybrid'
    ? google.maps.MapTypeId.HYBRID
    : type === 'satellite'
      ? google.maps.MapTypeId.SATELLITE
      : google.maps.MapTypeId.TERRAIN);
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
  } catch (error) {
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
    button.addEventListener('click', () => closeModal(button.closest('.modal')));
  });
  [elements.loginModal, elements.registerModal].forEach(modal => {
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
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
      document.getElementById('mobileLogoutBtn')?.addEventListener('click', () => performLogout());
      document.getElementById('mobileAccountLink')?.addEventListener('click', () => {
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

  elements.loginBtn?.addEventListener('click', () => openModal(elements.loginModal));
  elements.registerBtn?.addEventListener('click', () => openModal(elements.registerModal));
  elements.accountBtn?.addEventListener('click', () => {
    window.location.href = 'index.html#userDashboard';
  });
  elements.logoutBtn?.addEventListener('click', () => performLogout());

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

  onAuthStateChanged(auth, async (user) => {
    updateAuthUI(user);
    if (!user) {
      showToast('Zaloguj się, aby edytować ofertę.', 'info');
      redirectToDetails();
      return;
    }
    state.user = user;
    if (!state.hasLoaded) {
      await loadProperty();
      state.hasLoaded = true;
    }
  });
}

function validatePlot(plot) {
  if (plot.price !== null && plot.price < 0) {
    showToast('Cena nie może być ujemna.', 'error');
    return false;
  }
  if (plot.pow_dzialki_m2_uldk !== null && plot.pow_dzialki_m2_uldk <= 0) {
    showToast('Powierzchnia musi być większa od zera.', 'error');
    return false;
  }
  return true;
}

function buildUpdatedPlot() {
  const base = cloneDeep(state.plotData || {});
  base.title = stripHtml(elements.propertyTitle.innerHTML).trim() || 'Działka';
  base.location = stripHtml(elements.propertyLocation.innerHTML).trim();
  base.propertyType = stripHtml(elements.propertyType.innerHTML).trim();
  base.ownershipStatus = stripHtml(elements.ownershipStatus.innerHTML).trim();
  base.price = state.price;
  base.pricePerSqm = state.price && state.area ? Math.round(state.price / state.area) : null;
  base.priceUpdatedAt = new Date().toISOString();
  base.pow_dzialki_m2_uldk = state.area;
  base.area = state.area;
  base.plotNumber = stripHtml(elements.plotNumber.innerHTML).trim();
  base.landRegister = stripHtml(elements.landRegister.innerHTML).trim();
  base.status = stripHtml(elements.plotStatus.innerHTML).trim();
  base.locationAddress = sanitizeMultilineText(elements.locationAddress.textContent || '');
  base.locationAccess = sanitizeMultilineText(elements.locationAccess.textContent || '');
  base.planDesignation = stripHtml(elements.planDesignation.innerHTML).trim();
  base.planHeight = stripHtml(elements.planHeight.innerHTML).trim();
  base.planIntensity = stripHtml(elements.planIntensity.innerHTML).trim();
  base.planGreen = stripHtml(elements.planGreen.innerHTML).trim();
  base.planNotes = sanitizeMultilineText(elements.planNotes.textContent || '');
  base.description = sanitizeMultilineText(elements.descriptionText.textContent || '');
  base.utilities = { ...state.utilities };
  base.tags = [...state.tags];
  base.contactName = stripHtml(elements.contactName.innerHTML).trim();
  base.contactPhone = stripHtml(elements.contactPhoneLink.innerHTML).trim();
  base.contactEmail = stripHtml(elements.contactEmailLink.innerHTML).trim();
  base.planBadges = state.planBadges || base.planBadges || [];
  return base;
}

async function handleSave() {
  if (state.saving) return;
  const updatedPlot = buildUpdatedPlot();
  if (!validatePlot(updatedPlot)) return;

  try {
    state.saving = true;
    if (elements.saveChangesBtn) elements.saveChangesBtn.disabled = true;
    const { db } = initFirebase();
    const offerRef = doc(db, 'propertyListings', state.offerId);
    const plots = Array.isArray(state.offerData?.plots) ? cloneDeep(state.offerData.plots) : [];
    plots[state.plotIndex] = updatedPlot;
    await updateDoc(offerRef, { plots, updatedAt: serverTimestamp() });
    showToast('Zapisano zmiany.', 'success');
    state.offerData.plots = plots;
    state.plotData = cloneDeep(updatedPlot);
    renderPriceUpdatedAt(new Date());
    setPriceEdit(state.price);
    setAreaEdit(state.area);
    renderUtilitiesEdit();
    renderTagsEdit();
  } catch (error) {
    console.error('handleSave', error);
    showToast('Nie udało się zapisać zmian. Spróbuj ponownie.', 'error');
  } finally {
    state.saving = false;
    if (elements.saveChangesBtn) elements.saveChangesBtn.disabled = false;
  }
}

async function loadProperty() {
  if (!state.offerId) {
    showError('Nie wskazano oferty do edycji.');
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
    const ownerUid = pickValue(data.ownerUid, data.userUid, data.uid, data.ownerId);
    if (ownerUid && ownerUid !== state.user?.uid) {
      showToast('Nie masz uprawnień do edycji tej oferty.', 'error');
      redirectToDetails();
      return;
    }
    const plots = Array.isArray(data.plots) ? data.plots : [];
    const plot = plots[state.plotIndex];
    if (!plot) {
      showError('Nie odnaleziono wskazanej działki.');
      return;
    }
    renderEditor(data, plot);
    await renderMap(plot);
    showContent();
  } catch (error) {
    console.error('loadProperty', error);
    showError('Wystąpił błąd podczas wczytywania danych.');
  }
}

async function init() {
  syncMobileMenu();
  const { offerId, plotIndex } = parseQueryParams();
  state.offerId = offerId;
  state.plotIndex = plotIndex;
  if (!offerId) {
    showError('Nie wskazano oferty do edycji.');
    return;
  }
  initFirebase();
  setupAuthUI();
  setupMapModeButtons();
  elements.saveChangesBtn?.addEventListener('click', () => handleSave());
}

init();
