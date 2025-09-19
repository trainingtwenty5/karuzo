import {
  initFirebase,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
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
  tagSuggestions: [],
  tagSuggestionsLoaded: false,
  loadingTagSuggestions: false,
  price: null,
  area: null,
  saving: false,
  planBadges: null,
  map: null,
  marker: null,
  polygon: null,
  hasLoaded: false
};

const EMPTY_FIELD_PLACEHOLDER = 'Pole do wypełnienia';

const elements = {
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  propertyContent: document.getElementById('propertyContent'),
  saveChangesBtn: document.getElementById('saveChangesBtn'),
  propertyTitle: document.getElementById('propertyTitle'),
  propertyLocation: document.getElementById('propertyLocation'),
  propertyArea: document.getElementById('propertyArea'),
  propertyTypeSelect: document.getElementById('propertyTypeSelect'),
  ownershipFormSelect: document.getElementById('ownershipFormSelect'),
  priceValueText: document.getElementById('priceValueText'),
  pricePerSqm: document.getElementById('pricePerSqm'),
  priceUpdatedAt: document.getElementById('priceUpdatedAt'),
  plotNumber: document.getElementById('plotNumber'),
  landRegister: document.getElementById('landRegister'),
  plotAreaStat: document.getElementById('plotAreaStat'),
  plotOwnershipSelect: document.getElementById('plotOwnershipSelect'),
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
  tagSuggestionsWrapper: document.getElementById('tagSuggestionsWrapper'),
  tagSuggestionsList: document.getElementById('tagSuggestionsList'),
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

const TAG_SUGGESTION_LIMIT = 18;

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
    return EMPTY_FIELD_PLACEHOLDER;
  }
  const ppm = Math.round(price / area);
  const formatted = formatNumber(ppm);
  return formatted ? `${formatted} zł/m²` : EMPTY_FIELD_PLACEHOLDER;
}

function formatPrice(value) {
  const formatted = formatCurrency(value);
  return formatted ? `${formatted}` : EMPTY_FIELD_PLACEHOLDER;
}

function formatAreaText(value) {
  const formatted = formatArea(value);
  return formatted ? formatted : EMPTY_FIELD_PLACEHOLDER;
}

function applyPlaceholder(element, value) {
  if (!element) return;
  const text = textContentOrFallback(value, '');
  element.textContent = text || EMPTY_FIELD_PLACEHOLDER;
}

function applyMultilinePlaceholder(element, value) {
  if (!element) return;
  const sanitized = sanitizeMultilineText(value || '');
  const trimmed = sanitized.trim();
  element.textContent = trimmed ? sanitized : EMPTY_FIELD_PLACEHOLDER;
}

function normalizePlaceholderValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text.toLowerCase() === EMPTY_FIELD_PLACEHOLDER.toLowerCase() ? '' : text;
}

function normalizeMultilineValue(value) {
  const sanitized = sanitizeMultilineText(value || '');
  const trimmed = sanitized.trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase() === EMPTY_FIELD_PLACEHOLDER.toLowerCase() ? '' : sanitized;
}

function extractPlotNumberSegment(value) {
  if (value === undefined || value === null) return value;
  const str = String(value).trim();
  if (!str) return '';
  const lastDotIndex = str.lastIndexOf('.');
  if (lastDotIndex === -1) return str;
  const segment = str.slice(lastDotIndex + 1).trim();
  return segment || str;
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
  elements.priceUpdatedAt.textContent = formatted
    ? `Aktualizacja: ${formatted}`
    : `Aktualizacja: ${EMPTY_FIELD_PLACEHOLDER}`;
}

function ensureSelectOption(select, value) {
  if (!select) return;
  const text = typeof value === 'string' ? value.trim() : value;
  if (!text) return;
  const normalized = String(text);
  const exists = Array.from(select.options).some(option => option.value === normalized);
  if (!exists) {
    const option = new Option(normalized, normalized);
    option.dataset.dynamic = 'true';
    select.add(option);
  }
}

function setSelectValue(select, value, fallback = '') {
  if (!select) return;
  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (trimmed) {
    const normalized = String(trimmed);
    ensureSelectOption(select, normalized);
    select.value = normalized;
  } else if (fallback) {
    ensureSelectOption(select, fallback);
    select.value = fallback;
  } else {
    select.value = '';
  }
}

function normalizeOwnershipForm(value) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (/użytkowanie/i.test(text)) {
    return 'Użytkowanie wieczyste';
  }
  if (/prywatn/i.test(text)) {
    return 'Własność';
  }
  if (/własno/i.test(text)) {
    return 'Własność';
  }
  return text;
}

function deriveStatusFromOwnership(ownershipForm) {
  if (!ownershipForm) return '';
  if (/użytkowanie/i.test(ownershipForm)) {
    return 'Użytkowanie wieczyste';
  }
  if (/zarząd/i.test(ownershipForm)) {
    return 'Zarząd';
  }
  return 'Własność (pełna)';
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

function renderTagSuggestions() {
  if (!elements.tagSuggestionsList) return;

  const listElement = elements.tagSuggestionsList;
  listElement.innerHTML = '';

  const selected = new Set(state.tags.map(tag => tag.toLowerCase()));
  const available = Array.isArray(state.tagSuggestions)
    ? state.tagSuggestions.filter(tag => !selected.has(tag.toLowerCase()))
    : [];

  if (!available.length) {
    if (elements.tagSuggestionsWrapper) {
      elements.tagSuggestionsWrapper.hidden = true;
    }
    return;
  }

  const limit = TAG_SUGGESTION_LIMIT > 0 ? TAG_SUGGESTION_LIMIT : available.length;
  available.slice(0, limit).forEach(tag => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-chip tag-chip--suggestion';
    button.textContent = tag;
    button.dataset.tag = tag;
    button.setAttribute('aria-label', `Dodaj znacznik ${tag}`);
    listElement.appendChild(button);
  });

  if (elements.tagSuggestionsWrapper) {
    elements.tagSuggestionsWrapper.hidden = false;
  }
}

function renderTagsEdit() {
  if (!elements.tagsList || !elements.tagsEmpty) return;
  elements.tagsList.innerHTML = '';
  if (!state.tags.length) {
    elements.tagsEmpty.hidden = false;
    renderTagSuggestions();
    return;
  }
  elements.tagsEmpty.hidden = true;
  state.tags.forEach((tag, index) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip removable';
    chip.innerHTML = `<span>${tag}</span><button type="button" class="tag-remove" data-index="${index}" aria-label="Usuń znacznik">&times;</button>`;
    elements.tagsList.appendChild(chip);
  });
  renderTagSuggestions();
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
  if (!element?.isContentEditable) return;
  element.addEventListener('keydown', (event) => {
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
    if (!element || !element.isContentEditable) return;
    handleAreaFocus(element);
    handleAreaBlur(element);
    handleAreaInput(element);
  });

  [
    elements.propertyTitle,
    elements.propertyLocation,
    elements.plotNumber,
    elements.landRegister,
    elements.planDesignation,
    elements.planHeight,
    elements.planIntensity,
    elements.planGreen,
    elements.contactName,
    elements.contactPhoneLink,
    elements.contactEmailLink
  ].forEach(element => {
    if (!element || !element.isContentEditable) return;
    preventNewline(element);
    element.addEventListener('blur', () => {
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

  elements.plotOwnershipSelect?.addEventListener('change', () => {
    const value = elements.plotOwnershipSelect.value;
    if (!elements.ownershipFormSelect) return;
    if (/użytkowanie/i.test(value)) {
      setSelectValue(elements.ownershipFormSelect, 'Użytkowanie wieczyste', 'Użytkowanie wieczyste');
    } else if (value) {
      setSelectValue(elements.ownershipFormSelect, 'Własność', 'Własność');
    }
  });

  elements.ownershipFormSelect?.addEventListener('change', () => {
    if (!elements.plotOwnershipSelect) return;
    const ownershipValue = elements.ownershipFormSelect.value;
    const currentStatus = elements.plotOwnershipSelect.value;
    if (!currentStatus) {
      const derived = deriveStatusFromOwnership(ownershipValue);
      if (derived) {
        setSelectValue(elements.plotOwnershipSelect, derived, derived);
      }
      return;
    }
    if (ownershipValue === 'Użytkowanie wieczyste' && !/użytkowanie/i.test(currentStatus)) {
      setSelectValue(elements.plotOwnershipSelect, 'Użytkowanie wieczyste', 'Użytkowanie wieczyste');
    } else if (ownershipValue === 'Własność' && /użytkowanie/i.test(currentStatus)) {
      setSelectValue(elements.plotOwnershipSelect, 'Własność (pełna)', 'Własność (pełna)');
    }
  });

  if (elements.contactPhoneLink?.isContentEditable) {
    elements.contactPhoneLink.addEventListener('input', () => {
      const formatted = formatPhoneNumber(stripHtml(elements.contactPhoneLink.innerHTML));
      if (formatted) {
        elements.contactPhoneLink.textContent = formatted;
        selectAllText(elements.contactPhoneLink);
      }
    });
  }

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

  elements.tagSuggestionsList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tag]');
    if (!button) return;
    const tag = button.dataset.tag;
    if (tag) {
      addTag(tag);
    }
  });
}

function normalizeTag(rawValue) {
  if (rawValue === undefined || rawValue === null) return '';
  let text = String(rawValue).trim();
  if (!text) return '';
  text = text.replace(/^#+/, '');
  text = text.replace(/[_\s]+/g, '-');
  text = text.replace(/-+/g, '-');
  text = text.replace(/[^0-9A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż-]/g, '');
  if (!text) return '';
  const segments = text.split('-').filter(Boolean);
  if (!segments.length) return '';
  const formatted = segments.map((segment, index) => {
    if (/^[0-9]+$/.test(segment)) {
      return segment;
    }
    if (segment === segment.toUpperCase() && segment.length > 1) {
      if (index === 0) {
        const lower = segment.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return segment.toUpperCase();
    }
    const lower = segment.toLowerCase();
    if (index === 0) {
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    return lower;
  });
  return `#${formatted.join('-')}`;
}

function addTag(rawValue) {
  const normalized = normalizeTag(rawValue);
  if (!normalized) {
    showToast('Podaj treść znacznika.', 'warning');
    return;
  }
  if (state.tags.some(existing => existing.toLowerCase() === normalized.toLowerCase())) {
    showToast('Taki znacznik już istnieje.', 'info');
    if (elements.tagInput) elements.tagInput.value = '';
    return;
  }
  state.tags.push(normalized);
  renderTagsEdit();
  if (elements.tagInput) elements.tagInput.value = '';
}

async function loadTagSuggestions() {
  if (state.loadingTagSuggestions || state.tagSuggestionsLoaded) {
    return;
  }
  state.loadingTagSuggestions = true;
  try {
    const { db } = initFirebase();
    const snapshot = await getDocs(collection(db, 'propertyListings'));
    const accumulator = new Map();

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const plots = Array.isArray(data?.plots) ? data.plots : [];
      plots.forEach(plot => {
        const normalizedTags = ensureArray(plot?.tags)
          .map(normalizeTag)
          .filter(Boolean);
        const uniqueTags = [];
        normalizedTags.forEach(tag => {
          if (!uniqueTags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
            uniqueTags.push(tag);
          }
        });
        uniqueTags.forEach(tag => {
          const key = tag.toLowerCase();
          const entry = accumulator.get(key);
          if (entry) {
            entry.count += 1;
          } else {
            accumulator.set(key, { tag, count: 1 });
          }
        });
      });
    });

    state.tagSuggestions = Array.from(accumulator.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.tag.localeCompare(b.tag, 'pl', { sensitivity: 'base' });
      })
      .map(entry => entry.tag);
    state.tagSuggestionsLoaded = true;
    renderTagSuggestions();
  } catch (error) {
    console.error('loadTagSuggestions', error);
  } finally {
    state.loadingTagSuggestions = false;
  }
}

function renderEditor(data, plot) {
  const rebind = !!state.plotData;
  state.offerData = data;
  state.plotData = cloneDeep(plot);

  const title = pickValue(plot.title, plot.name, plot.Id, `Działka ${state.plotIndex + 1}`);
  elements.propertyTitle.textContent = textContentOrFallback(title, 'Działka');
  document.title = `Edycja działki - ${textContentOrFallback(title, 'Działka')}`;

  const location = pickValue(plot.location, plot.city, data.city, data.location);
  applyPlaceholder(elements.propertyLocation, location);

  let propertyType = pickValue(plot.propertyType, plot.type, data.propertyType, '');
  if (typeof propertyType === 'string' && propertyType.trim().toLowerCase() === 'rodzaj') {
    propertyType = '';
  }
  setSelectValue(elements.propertyTypeSelect, propertyType, '');

  const ownershipRaw = pickValue(plot.ownershipStatus, plot.ownership, data.ownershipStatus, 'Własność');
  const normalizedOwnership = normalizeOwnershipForm(ownershipRaw) || 'Własność';
  setSelectValue(elements.ownershipFormSelect, normalizedOwnership, 'Własność');

  const price = parseNumberFromText(pickValue(plot.price, data.price));
  setPriceEdit(price);

  const area = parseNumberFromText(pickValue(plot.pow_dzialki_m2_uldk, plot.area, data.area));
  setAreaEdit(area);

  renderPriceUpdatedAt(pickValue(plot.priceUpdatedAt, data.updatedAt, data.timestamp));

  const plotNumberValue = pickValue(plot.plotNumber, plot.Id, plot.number);
  applyPlaceholder(elements.plotNumber, extractPlotNumberSegment(plotNumberValue));
  applyPlaceholder(elements.landRegister, pickValue(plot.landRegister, plot.kwNumber, plot.landRegistry, plot.numer_kw));
  const statusValue = pickValue(plot.status, plot.offerStatus, data.status, '');
  setSelectValue(elements.plotOwnershipSelect, statusValue, '');
  if (!elements.plotOwnershipSelect?.value) {
    const derivedStatus = deriveStatusFromOwnership(normalizedOwnership);
    if (derivedStatus) {
      setSelectValue(elements.plotOwnershipSelect, derivedStatus, derivedStatus);
    }
  }

  applyMultilinePlaceholder(elements.locationAddress, pickValue(plot.locationAddress, data.address, plot.address));
  applyMultilinePlaceholder(elements.locationAccess, pickValue(plot.locationAccess, plot.access, data.access));

  state.planBadges = cloneDeep(pickValue(plot.planBadges, data.planBadges));
  renderPlanBadges(state.planBadges);
  applyPlaceholder(elements.planDesignation, pickValue(plot.planDesignation, plot.planUsage, data.planDesignation));
  applyPlaceholder(elements.planHeight, pickValue(plot.planHeight, data.planHeight));
  applyPlaceholder(elements.planIntensity, pickValue(plot.planIntensity, data.planIntensity));
  applyPlaceholder(elements.planGreen, pickValue(plot.planGreen, data.planGreen));
  applyMultilinePlaceholder(elements.planNotes, pickValue(plot.planNotes, data.planNotes));

  state.utilities = mergeUtilities(data.utilities, plot.utilities);
  renderUtilitiesEdit();

  applyMultilinePlaceholder(elements.descriptionText, pickValue(plot.description, data.description));

  const normalizedTags = ensureArray(pickValue(plot.tags, data.tags))
    .map(normalizeTag)
    .filter(Boolean);
  const uniqueTags = [];
  normalizedTags.forEach(tag => {
    if (!uniqueTags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      uniqueTags.push(tag);
    }
  });
  state.tags = uniqueTags;
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

function ensureProjDefinition() {
  if (typeof proj4 === 'undefined' || typeof proj4.defs !== 'function') {
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
  } catch (error) {
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
    if (!bounds.isEmpty()) {
      state.map.fitBounds(bounds, { top: 32, right: 32, bottom: 32, left: 32 });
    }
  }
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
  const locationText = normalizePlaceholderValue(stripHtml(elements.propertyLocation.innerHTML));
  base.location = locationText;
  base.city = locationText;
  base.propertyType = (elements.propertyTypeSelect?.value || '').trim();
  base.ownershipStatus = (elements.ownershipFormSelect?.value || '').trim();
  base.price = state.price;
  base.pricePerSqm = state.price && state.area ? Math.round(state.price / state.area) : null;
  base.priceUpdatedAt = new Date().toISOString();
  base.pow_dzialki_m2_uldk = state.area;
  base.area = state.area;
  base.landRegister = normalizePlaceholderValue(stripHtml(elements.landRegister.innerHTML));
  base.status = (elements.plotOwnershipSelect?.value || '').trim();
  base.locationAddress = normalizeMultilineValue(elements.locationAddress.textContent || '');
  base.locationAccess = normalizeMultilineValue(elements.locationAccess.textContent || '');
  base.planDesignation = normalizePlaceholderValue(stripHtml(elements.planDesignation.innerHTML));
  base.planHeight = normalizePlaceholderValue(stripHtml(elements.planHeight.innerHTML));
  base.planIntensity = normalizePlaceholderValue(stripHtml(elements.planIntensity.innerHTML));
  base.planGreen = normalizePlaceholderValue(stripHtml(elements.planGreen.innerHTML));
  base.planNotes = normalizeMultilineValue(elements.planNotes.textContent || '');
  base.description = normalizeMultilineValue(elements.descriptionText.textContent || '');
  base.utilities = { ...state.utilities };
  base.tags = [...state.tags];
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

    const locationValue = typeof updatedPlot.location === 'string' ? updatedPlot.location.trim() : '';
    const updatePayload = { plots, updatedAt: serverTimestamp(), city: locationValue };
    if (typeof state.offerData?.location === 'string' || state.offerData?.location === undefined || state.offerData?.location === null) {
      updatePayload.location = locationValue;
    } else if (state.offerData?.location && typeof state.offerData.location === 'object') {
      updatePayload['location.city'] = locationValue;
    }

    await updateDoc(offerRef, updatePayload);
    showToast('Zapisano zmiany.', 'success');
    state.offerData.plots = plots;
    if (state.offerData) {
      state.offerData.city = locationValue;
      if (typeof state.offerData.location === 'string' || state.offerData.location === undefined || state.offerData.location === null) {
        state.offerData.location = locationValue;
      } else if (typeof state.offerData.location === 'object') {
        state.offerData.location = { ...state.offerData.location, city: locationValue };
      }
    }
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
  loadTagSuggestions();
  setupAuthUI();
  setupMapModeButtons();
  elements.saveChangesBtn?.addEventListener('click', () => handleSave());
}

init();
