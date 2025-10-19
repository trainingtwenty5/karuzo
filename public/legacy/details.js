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
  sanitizeRichText,
  ensureArray,
  parseNumberFromText,
  getCachedPropertyListing,
  setCachedPropertyListing,
  syncMobileMenu,
  setDoc,
  richTextToPlainText
} from './property-common.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const MAP_STATE_STORAGE_KEY = 'grunteo::offers::mapState';
const MAP_STATE_TTL_MS = 1000 * 60 * 60 * 12; // 12 godzin

const FAVORITES_CACHE_TTL_MS = 60 * 1000;

const ARCHIVED_MARKER_SYMBOL = {
  path: 'M -12 -12 L 12 12 M -12 12 L 12 -12',
  strokeColor: '#ff3b30',
  strokeOpacity: 1,
  strokeWeight: 4,
  scale: 1.4
};

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
  mapImages: {},
  currentMapMode: 'base',
  shareUrl: '',
  favorites: [],
  favoritesLoadedAt: 0,
  favoritesLoadingPromise: null,
  savingFavorite: false,
  isLightboxOpen: false,
  lightboxReturnFocus: null,
  lightboxZoom: 1,
  lightboxBaseWidth: 0,
  lightboxBaseHeight: 0,
  lightboxImageModes: [],
  lightboxActiveMode: '',
  isArchived: false
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
  shareLinkInput: document.getElementById('shareLinkInput'),
  shareCopyBtn: document.getElementById('shareCopyBtn'),
  shareMessenger: document.getElementById('shareMessenger'),
  shareWhatsapp: document.getElementById('shareWhatsapp'),
  shareX: document.getElementById('shareX'),
  shareFacebook: document.getElementById('shareFacebook'),
  savePlotBtn: document.getElementById('savePlotBtn'),
  inquiryForm: document.getElementById('inquiryForm'),
  mapSection: document.getElementById('mapSection'),
  mapElement: document.getElementById('propertyMap'),
  mapImageContainer: document.getElementById('mapImageContainer'),
  mapImageElement: document.getElementById('mapImage'),
  mapImagePlaceholder: document.getElementById('mapImagePlaceholder'),
  plotPreviewImage: document.getElementById('plotPreviewImage'),
  plotPreviewPlaceholder: document.getElementById('plotPreviewPlaceholder'),
  mapModeButtons: Array.from(document.querySelectorAll('.map-mode-btn')),
  mapImageLightbox: document.getElementById('mapImageLightbox'),
  mapImageLightboxStage: document.getElementById('mapImageLightboxStage'),
  mapImageLightboxPicture: document.getElementById('mapImageLightboxPicture'),
  mapImageLightboxClose: document.getElementById('mapImageLightboxClose'),
  mapImageLightboxPrev: document.getElementById('mapImageLightboxPrev'),
  mapImageLightboxNext: document.getElementById('mapImageLightboxNext'),
  mapImageLightboxZoomIn: document.getElementById('mapImageLightboxZoomIn'),
  mapImageLightboxZoomOut: document.getElementById('mapImageLightboxZoomOut'),
  mapImageLightboxInfo: document.getElementById('mapImageLightboxInfo'),
  mapImageLightboxModeLabel: document.getElementById('mapImageLightboxModeLabel'),
  backToOffersBtn: document.getElementById('backToOffersBtn'),
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

function readOffersMapState() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(MAP_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const timestamp = Number(parsed.timestamp);
    if (Number.isFinite(timestamp) && MAP_STATE_TTL_MS > 0) {
      const age = Date.now() - timestamp;
      if (age > MAP_STATE_TTL_MS) {
        return null;
      }
    }
    return parsed;
  } catch (error) {
    console.warn('Nie udało się odczytać zapisanego stanu mapy ofert.', error);
    return null;
  }
}

function configureBackToOffersButton() {
  if (!elements.backToOffersBtn) return;
  const storedState = readOffersMapState();
  const defaultHref = 'oferty.html#map';
  elements.backToOffersBtn.setAttribute('href', defaultHref);
  if (storedState) {
    elements.backToOffersBtn.title = 'Powrót do listy ofert (przywróci zapisany widok mapy).';
    elements.backToOffersBtn.dataset.mapState = 'available';
  } else {
    elements.backToOffersBtn.title = 'Powrót do listy ofert.';
    elements.backToOffersBtn.dataset.mapState = 'missing';
  }
}

function ensureMapStateFocusHint(offerId, plotIndex) {
  if (!offerId || typeof window === 'undefined' || !window.localStorage) return;
  const storedState = readOffersMapState();
  if (!storedState) return;
  const hasView = (storedState.center && Number.isFinite(storedState.center.lat) && Number.isFinite(storedState.center.lng))
    || Number.isFinite(storedState.zoom);
  if (!hasView) return;

  const normalizedPlotIndex = Number.isInteger(plotIndex) ? plotIndex : null;
  const sameOffer = storedState.focusOfferId === offerId;
  const samePlot = normalizedPlotIndex === null
    ? !Number.isInteger(storedState.focusPlotIndex)
    : storedState.focusPlotIndex === normalizedPlotIndex;
  if (sameOffer && samePlot) {
    return;
  }

  const updatedState = { ...storedState, focusOfferId: offerId, timestamp: Date.now() };
  if (normalizedPlotIndex === null) {
    delete updatedState.focusPlotIndex;
  } else {
    updatedState.focusPlotIndex = normalizedPlotIndex;
  }

  try {
    window.localStorage.setItem(MAP_STATE_STORAGE_KEY, JSON.stringify(updatedState));
  } catch (error) {
    console.warn('Nie udało się zaktualizować informacji o działce w stanie mapy ofert.', error);
  }
}

configureBackToOffersButton();

elements.mapImageElement?.addEventListener('error', handleMapImageError);
elements.mapImageElement?.addEventListener('click', handleMapImageClick);
elements.mapImageElement?.addEventListener('keydown', handleMapImageKeydown);
elements.mapImageLightboxClose?.addEventListener('click', closeMapImageLightbox);
elements.mapImageLightbox?.addEventListener('click', handleLightboxBackdropClick);
elements.mapImageLightboxPrev?.addEventListener('click', handleLightboxPrevClick);
elements.mapImageLightboxNext?.addEventListener('click', handleLightboxNextClick);
elements.mapImageLightboxZoomIn?.addEventListener('click', handleLightboxZoomIn);
elements.mapImageLightboxZoomOut?.addEventListener('click', handleLightboxZoomOut);
document.addEventListener('keydown', handleLightboxKeydown);

updateZoomButtonsState();

const MAP_MODE_DEFAULT = 'base';

const LIGHTBOX_ZOOM_DEFAULT = 1;
const LIGHTBOX_ZOOM_MIN = 0.5;
const LIGHTBOX_ZOOM_MAX = 3;
const LIGHTBOX_ZOOM_STEP = 0.25;

const MAP_MODES = {
  base: { type: 'map', mapType: 'hybrid' },
  lokalizacja: { type: 'image', key: 'lokalizacja' },
  media: { type: 'image', key: 'media' },
  teren: { type: 'image', key: 'teren' },
  mpzp: { type: 'image', key: 'mpzp' },
  mpzpskan: { type: 'image', key: 'mpzpskan' },
  studium: { type: 'image', key: 'studium' },
  uzytkigruntowe: { type: 'image', key: 'uzytkigruntowe' }
};

const MAP_LAYER_BASE_URLS = {
  lokalizacja: 'https://grunteo.s3.eu-west-3.amazonaws.com/Orto_Esri%2BGrunty/MARGE_Orto_Esri%2BGrunty',
  media: 'https://grunteo.s3.eu-west-3.amazonaws.com/Cyclosm_Esri%2BGESUT/MARGE_Cyclosm_Esri%2BGESUT',
  teren: 'https://grunteo.s3.eu-west-3.amazonaws.com/GRID%2BGrunty/MARGE_GRID%2BGrunty',
  mpzp: 'https://grunteo.s3.eu-west-3.amazonaws.com/MPZP%2BGrunty/MARGE_MPZP%2BGrunty',
  mpzpskan: 'https://grunteo.s3.eu-west-3.amazonaws.com/MPZP_rastrowe%2BGrunty/MARGE_MPZP_rastrowe%2BGrunty',
  studium: 'https://grunteo.s3.eu-west-3.amazonaws.com/Studium%2BGrunty/MARGE_Studium%2BGrunty',
  uzytkigruntowe: 'https://grunteo.s3.eu-west-3.amazonaws.com/Uzytki%2BGrunty/MARGE_Uzytki%2BGrunty'
};

const MAP_LAYER_ALIASES = {
  lokalizacja: ['lokalizacja', 'location', 'localization', 'orto', 'orthophoto', 'aerial'],
  media: ['media', 'uzbrojenie', 'utilities', 'gesut', 'cyclosm'],
  teren: ['teren', 'terrain', 'grid', 'ground', 'siatka'],
  mpzp: ['mpzp', 'plan', 'zoning', 'miejscowyplan'],
  mpzpskan: ['mpzpskan', 'mpzpraster', 'mpzprastrowe', 'mpzpscan', 'planraster', 'planrasterowy', 'planzdjecie', 'skanmpzp', 'skanplanu'],
  studium: ['studium', 'study', 'uwarunkowania', 'kierunki'],
  uzytkigruntowe: ['uzytkigruntowe', 'uzytki', 'uzytkirolne', 'landuse', 'landusage', 'pokryciegruntu']
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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return value;
  return Math.min(Math.max(value, min), max);
}

function formatPrice(value) {
  const formatted = formatCurrency(value);
  return formatted ? `${formatted}` : '';
}

function formatPerSqm(price, area) {
  if (!Number.isFinite(price) || !Number.isFinite(area) || area <= 0) {
    return '';
  }
  const result = Math.round(price / area);
  const formatted = formatNumber(result);
  return formatted ? `${formatted} zł/m²` : '';
}

function formatAreaText(value) {
  const formatted = formatArea(value);
  return formatted ? formatted : '';
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

function setTextContent(element, value, fallback = '') {
  if (!element) return;
  element.textContent = textContentOrFallback(value, fallback);
}

function setMultilineText(element, value, fallback = '') {
  if (!element) return;
  const text = value === null || value === undefined || value === ''
    ? fallback
    : sanitizeMultilineText(value);
  element.textContent = text;
}

function setRichTextContent(element, value, fallback = '') {
  if (!element) return;
  const sanitized = sanitizeRichText(value || '');
  const plain = richTextToPlainText(sanitized).trim();
  if (plain) {
    element.innerHTML = sanitized;
  } else {
    element.textContent = fallback;
  }
}

function normalizeLayerKey(key) {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveImageUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return trimmed;
    }
    return '';
  }
  if (typeof value === 'object') {
    const candidate = value.url ?? value.href ?? value.src ?? value.value ?? value.link;
    if (typeof candidate === 'string') {
      return resolveImageUrl(candidate);
    }
  }
  return '';
}

function matchLayerKey(rawKey) {
  const normalized = normalizeLayerKey(rawKey);
  if (!normalized) return '';
  for (const [target, aliases] of Object.entries(MAP_LAYER_ALIASES)) {
    if (normalized === target) {
      return target;
    }
    for (const alias of aliases) {
      if (normalized === alias || normalized.includes(alias) || alias.includes(normalized)) {
        return target;
      }
    }
  }
  return '';
}

function extractLayerImages(source) {
  const result = {};
  if (!source) return result;
  if (Array.isArray(source)) {
    source.forEach(item => Object.assign(result, extractLayerImages(item)));
    return result;
  }
  if (typeof source !== 'object') return result;
  const candidateKey = source.key ?? source.type ?? source.layer ?? source.name ?? source.label;
  const candidateUrl = source.url ?? source.href ?? source.src ?? source.value ?? source.link;
  const matchedKey = matchLayerKey(candidateKey);
  const resolvedUrl = resolveImageUrl(candidateUrl);
  if (matchedKey && resolvedUrl) {
    result[matchedKey] = resolvedUrl;
  }
  Object.entries(source).forEach(([key, value]) => {
    const layerKey = matchLayerKey(key);
    if (!layerKey) return;
    const url = resolveImageUrl(value);
    if (url) {
      result[layerKey] = url;
    }
  });
  return result;
}

function collectMapImages(plot = {}, offer = {}, plotIndex = 0, fallbackId = '') {
  const sources = [
    plot.mapImages,
    plot.mapTiles,
    plot.mapLayers,
    plot.planImages,
    plot.planTiles,
    plot.mapPreviews,
    plot.mapGallery,
    offer.mapImages,
    offer.mapTiles,
    offer.mapLayers,
    offer.planImages,
    offer.planTiles,
    offer.mapPreviews,
    offer.mapGallery
  ];
  const result = {};
  sources.forEach(source => Object.assign(result, extractLayerImages(source)));

  const directFields = {
    lokalizacja: [
      plot.mapLokalizacja,
      plot.lokalizacjaMap,
      plot.mapLocation,
      plot.locationMap,
      offer.mapLokalizacja,
      offer.lokalizacjaMap,
      offer.mapLocation,
      offer.locationMap
    ],
    media: [
      plot.mapMedia,
      plot.mediaMap,
      plot.mapUzbrojenie,
      plot.mapGesut,
      offer.mapMedia,
      offer.mediaMap,
      offer.mapUzbrojenie,
      offer.mapGesut
    ],
    teren: [
      plot.mapTeren,
      plot.terrainMap,
      plot.mapGrid,
      plot.gridMap,
      offer.mapTeren,
      offer.terrainMap,
      offer.mapGrid,
      offer.gridMap
    ],
    mpzp: [
      plot.mapMpzp,
      plot.mapMPZP,
      plot.mpzpMap,
      plot.planMap,
      offer.mapMpzp,
      offer.mapMPZP,
      offer.mpzpMap,
      offer.planMap
    ],
    mpzpskan: [
      plot.mapMpzpSkan,
      plot.mapMpzpScan,
      plot.mapMpzpRaster,
      plot.mapMpzpRastrowe,
      plot.mapMPZPSkan,
      plot.mapMPZPScan,
      plot.mapMPZPRaster,
      plot.mpzpSkan,
      plot.mpzpScan,
      plot.mpzpRaster,
      plot.planRaster,
      plot.planScan,
      plot.planSkan,
      offer.mapMpzpSkan,
      offer.mapMpzpScan,
      offer.mapMpzpRaster,
      offer.mapMpzpRastrowe,
      offer.mapMPZPSkan,
      offer.mapMPZPScan,
      offer.mapMPZPRaster,
      offer.mpzpSkan,
      offer.mpzpScan,
      offer.mpzpRaster,
      offer.planRaster,
      offer.planScan,
      offer.planSkan
    ],
    studium: [
      plot.mapStudium,
      plot.studiumMap,
      offer.mapStudium,
      offer.studiumMap
    ],
    uzytkigruntowe: [
      plot.mapUzytki,
      plot.mapUzytkiGruntowe,
      plot.mapUzytkiGruntu,
      plot.mapUzytkiRolne,
      plot.uzytkiMap,
      plot.uzytkiGruntoweMap,
      plot.mapLandUse,
      plot.landUseMap,
      plot.landuseMap,
      plot.mapLandcover,
      offer.mapUzytki,
      offer.mapUzytkiGruntowe,
      offer.mapUzytkiGruntu,
      offer.mapUzytkiRolne,
      offer.uzytkiMap,
      offer.uzytkiGruntoweMap,
      offer.mapLandUse,
      offer.landUseMap,
      offer.landuseMap,
      offer.mapLandcover
    ]
  };

  Object.entries(directFields).forEach(([key, values]) => {
    if (result[key]) return;
    for (const value of values) {
      const url = resolveImageUrl(value);
      if (url) {
        result[key] = url;
        break;
      }
    }
  });

  const candidateIds = [
    typeof fallbackId === 'string' ? fallbackId.trim() : fallbackId,
    plot.mapImageId,
    plot.mapId,
    plot.imageId,
    plot.imagesId,
    plot.plotId,
    plot.Id,
    plot.id,
    offer.mapImageId,
    offer.mapId,
    offer.plotId,
    offer.Id,
    offer.id
  ];

  const trimmedId = candidateIds
    .map(value => {
      if (value === undefined || value === null) return '';
      const text = typeof value === 'string' ? value : String(value);
      return text.trim();
    })
    .find(value => value && /^[A-Za-z0-9_-]+$/.test(value)) || '';
  const indexNumber = Number.isFinite(plotIndex) && plotIndex >= 0 ? plotIndex : 0;
  const indexSuffix = `_${String(indexNumber).padStart(3, '0')}`;

  if (trimmedId) {
    const expectedSuffix = `_${trimmedId}${indexSuffix}.png`;
    Object.entries(MAP_LAYER_BASE_URLS).forEach(([key, baseUrl]) => {
      const expectedUrl = `${baseUrl}${expectedSuffix}`;
      const currentUrl = typeof result[key] === 'string' ? result[key].trim() : '';
      if (!currentUrl) {
        result[key] = expectedUrl;
        return;
      }
      const normalizedCurrent = currentUrl.split('?')[0];
      if (!normalizedCurrent.endsWith(expectedSuffix)) {
        result[key] = expectedUrl;
      }
    });
  }

  return result;
}

function getMapModeLabel(mode) {
  const button = elements.mapModeButtons.find(btn => btn.dataset.mode === mode);
  return button ? button.textContent.trim() : '';
}

function setActiveMapButton(mode) {
  elements.mapModeButtons.forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function showMapCanvas(mapType) {
  if (elements.mapImageContainer) {
    elements.mapImageContainer.classList.add('hidden');
  }
  if (elements.mapImageElement) {
    elements.mapImageElement.src = '';
    elements.mapImageElement.alt = '';
    elements.mapImageElement.classList.add('hidden');
  }
  if (elements.mapImagePlaceholder) {
    elements.mapImagePlaceholder.classList.add('hidden');
  }
  if (elements.mapElement) {
    elements.mapElement.classList.remove('hidden');
  }
  if (!state.map || typeof google === 'undefined' || !google?.maps) return;
  const type = typeof mapType === 'string' ? mapType.toLowerCase() : 'hybrid';
  const mapTypeId = type === 'terrain'
    ? google.maps.MapTypeId.TERRAIN
    : type === 'satellite'
      ? google.maps.MapTypeId.SATELLITE
      : google.maps.MapTypeId.HYBRID;
  state.map.setMapTypeId(mapTypeId);
  if (google.maps.event && typeof google.maps.event.trigger === 'function') {
    const center = typeof state.map.getCenter === 'function' ? state.map.getCenter() : null;
    google.maps.event.trigger(state.map, 'resize');
    if (center && typeof state.map.setCenter === 'function') {
      state.map.setCenter(center);
    }
  }
}

function showMapImage(key, label) {
  if (!elements.mapImageContainer || !elements.mapImageElement) return;
  const url = key ? state.mapImages[key] : '';
  const hasUrl = typeof url === 'string' && url.trim().length > 0;

  if (elements.mapElement) {
    elements.mapElement.classList.add('hidden');
  }
  elements.mapImageContainer.classList.remove('hidden');

  if (hasUrl) {
    elements.mapImageElement.src = url;
    elements.mapImageElement.alt = label ? `Warstwa „${label}”` : 'Podgląd warstwy mapy';
    elements.mapImageElement.dataset.layerLabel = label || '';
    elements.mapImageElement.classList.remove('hidden');
    elements.mapImageElement.classList.add('is-interactive');
    elements.mapImageElement.setAttribute('tabindex', '0');
    elements.mapImageElement.setAttribute('role', 'button');
    const accessibleLabel = label ? `Powiększ warstwę „${label}”` : 'Powiększ podgląd warstwy mapy';
    elements.mapImageElement.setAttribute('aria-label', accessibleLabel);
    elements.mapImagePlaceholder?.classList.add('hidden');
  } else {
    elements.mapImageElement.src = '';
    elements.mapImageElement.alt = '';
    delete elements.mapImageElement.dataset.layerLabel;
    elements.mapImageElement.classList.add('hidden');
    elements.mapImageElement.classList.remove('is-interactive');
    elements.mapImageElement.removeAttribute('tabindex');
    elements.mapImageElement.removeAttribute('role');
    elements.mapImageElement.removeAttribute('aria-label');
    if (elements.mapImagePlaceholder) {
      const name = label ? `warstwy „${label}”` : 'tej warstwy';
      elements.mapImagePlaceholder.textContent = `Brak obrazu dla ${name}.`;
      elements.mapImagePlaceholder.classList.remove('hidden');
    }
  }
}

function canOpenMapImageLightbox() {
  if (!elements.mapImageElement) return false;
  if (elements.mapImageElement.classList.contains('hidden')) return false;
  const src = elements.mapImageElement.getAttribute('src');
  return Boolean(src);
}

function computeLightboxBaseSize() {
  if (!elements.mapImageLightboxPicture) return null;
  const naturalWidth = elements.mapImageLightboxPicture.naturalWidth || elements.mapImageElement?.naturalWidth || 0;
  const naturalHeight = elements.mapImageLightboxPicture.naturalHeight || elements.mapImageElement?.naturalHeight || 0;
  if (!naturalWidth || !naturalHeight) return null;

  const viewportWidth = Math.max((window.innerWidth || naturalWidth) - 64, 320);
  const viewportHeight = Math.max((window.innerHeight || naturalHeight) - 160, 320);
  const ratio = Math.min(1, viewportWidth / naturalWidth, viewportHeight / naturalHeight);

  return {
    width: naturalWidth * ratio,
    height: naturalHeight * ratio
  };
}

function applyLightboxZoom() {
  if (!elements.mapImageLightboxPicture) return;
  const baseWidth = state.lightboxBaseWidth || elements.mapImageLightboxPicture.naturalWidth || elements.mapImageLightboxPicture.clientWidth;
  if (!baseWidth) {
    updateZoomButtonsState();
    return;
  }
  const width = baseWidth * state.lightboxZoom;
  elements.mapImageLightboxPicture.style.width = `${width}px`;
  elements.mapImageLightboxPicture.style.height = 'auto';
  elements.mapImageLightboxPicture.style.maxWidth = 'none';
  elements.mapImageLightboxPicture.style.maxHeight = 'none';
  updateZoomButtonsState();
}

function initializeLightboxZoom(preserveZoom = false) {
  state.lightboxBaseWidth = 0;
  state.lightboxBaseHeight = 0;
  if (!elements.mapImageLightboxPicture) {
    updateZoomButtonsState();
    return;
  }

  const size = computeLightboxBaseSize();
  if (size) {
    state.lightboxBaseWidth = size.width;
    state.lightboxBaseHeight = size.height;
  } else {
    const fallbackWidth = elements.mapImageElement?.clientWidth || elements.mapImageLightboxPicture.clientWidth || 0;
    const fallbackHeight = elements.mapImageElement?.clientHeight || elements.mapImageLightboxPicture.clientHeight || 0;
    state.lightboxBaseWidth = fallbackWidth;
    state.lightboxBaseHeight = fallbackHeight;
  }

  const nextZoom = preserveZoom
    ? clamp(state.lightboxZoom || LIGHTBOX_ZOOM_DEFAULT, LIGHTBOX_ZOOM_MIN, LIGHTBOX_ZOOM_MAX)
    : LIGHTBOX_ZOOM_DEFAULT;
  state.lightboxZoom = nextZoom;
  applyLightboxZoom();
}

function prepareLightboxZoom(preserveZoom = false) {
  if (!elements.mapImageLightboxPicture) {
    updateZoomButtonsState();
    return;
  }

  const apply = () => {
    initializeLightboxZoom(preserveZoom);
  };

  if (elements.mapImageLightboxPicture.complete && elements.mapImageLightboxPicture.naturalWidth) {
    apply();
  } else {
    elements.mapImageLightboxPicture.addEventListener('load', apply, { once: true });
  }
}

function adjustLightboxZoom(delta) {
  if (!state.isLightboxOpen) {
    updateZoomButtonsState();
    return;
  }
  const next = clamp(state.lightboxZoom + delta, LIGHTBOX_ZOOM_MIN, LIGHTBOX_ZOOM_MAX);
  if (Math.abs(next - state.lightboxZoom) < 0.001) {
    updateZoomButtonsState();
    return;
  }
  state.lightboxZoom = next;
  applyLightboxZoom();
}

function handleLightboxZoomIn(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  adjustLightboxZoom(LIGHTBOX_ZOOM_STEP);
}

function handleLightboxZoomOut(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  adjustLightboxZoom(-LIGHTBOX_ZOOM_STEP);
}

function resetLightboxStageScroll() {
  if (!elements.mapImageLightboxStage) return;
  elements.mapImageLightboxStage.scrollTop = 0;
  elements.mapImageLightboxStage.scrollLeft = 0;
}

function resetLightboxZoomState() {
  state.lightboxZoom = LIGHTBOX_ZOOM_DEFAULT;
  state.lightboxBaseWidth = 0;
  state.lightboxBaseHeight = 0;
  if (elements.mapImageLightboxPicture) {
    elements.mapImageLightboxPicture.style.width = '';
    elements.mapImageLightboxPicture.style.height = '';
    elements.mapImageLightboxPicture.style.maxWidth = '';
    elements.mapImageLightboxPicture.style.maxHeight = '';
  }
  resetLightboxStageScroll();
  updateZoomButtonsState();
}

function updateZoomButtonsState() {
  const zoomIn = elements.mapImageLightboxZoomIn;
  const zoomOut = elements.mapImageLightboxZoomOut;
  if (!zoomIn || !zoomOut) return;

  const isOpen = state.isLightboxOpen;
  const canZoomIn = isOpen && state.lightboxZoom < (LIGHTBOX_ZOOM_MAX - 0.001);
  const canZoomOut = isOpen && state.lightboxZoom > (LIGHTBOX_ZOOM_MIN + 0.001);

  zoomIn.disabled = !canZoomIn;
  zoomOut.disabled = !canZoomOut;
  zoomIn.setAttribute('aria-disabled', (!canZoomIn).toString());
  zoomOut.setAttribute('aria-disabled', (!canZoomOut).toString());
  zoomIn.classList.toggle('is-disabled', !canZoomIn);
  zoomOut.classList.toggle('is-disabled', !canZoomOut);
}

function applyLightboxTheme(mode) {
  if (!elements.mapImageLightbox) return;
  const useLightTheme = mode === 'uzytkigruntowe';
  elements.mapImageLightbox.classList.toggle('image-lightbox--light', useLightTheme);
}

function setLightboxModeLabel(label) {
  const info = elements.mapImageLightboxInfo;
  const labelElement = elements.mapImageLightboxModeLabel;
  if (!info || !labelElement) return;

  const text = typeof label === 'string' ? label.trim() : '';
  const normalized = text.replace(/^zakładka\s*:\s*/i, '').trim();
  if (normalized) {
    labelElement.textContent = normalized;
    info.classList.remove('hidden');
  } else {
    labelElement.textContent = '';
    info.classList.add('hidden');
  }
}

function getAvailableLightboxModes() {
  return (elements.mapModeButtons || [])
    .map(btn => btn?.dataset?.mode)
    .filter(mode => {
      if (!mode) return false;
      const config = MAP_MODES[mode];
      if (!config || config.type !== 'image') return false;
      const url = state.mapImages[config.key];
      return Boolean(url);
    });
}

function setLightboxNavigationState() {
  const prevBtn = elements.mapImageLightboxPrev;
  const nextBtn = elements.mapImageLightboxNext;
  if (!prevBtn || !nextBtn) return;

  const modes = Array.isArray(state.lightboxImageModes) ? state.lightboxImageModes : [];
  const index = modes.indexOf(state.lightboxActiveMode);
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < modes.length - 1;

  prevBtn.disabled = !hasPrev;
  nextBtn.disabled = !hasNext;
  prevBtn.setAttribute('aria-disabled', (!hasPrev).toString());
  nextBtn.setAttribute('aria-disabled', (!hasNext).toString());
  prevBtn.classList.toggle('is-disabled', !hasPrev);
  nextBtn.classList.toggle('is-disabled', !hasNext);
}

function showLightboxImage(mode, options = {}) {
  const { preserveZoom = false } = options;
  if (!elements.mapImageLightboxPicture) return false;
  const config = MAP_MODES[mode];
  if (!config || config.type !== 'image') return false;
  const url = state.mapImages[config.key];
  if (!url) return false;

  const label = getMapModeLabel(mode);
  const accessibleLabel = label
    ? `Powiększony widok warstwy „${label}”`
    : 'Powiększony podgląd warstwy mapy';

  state.lightboxActiveMode = mode;
  if (!preserveZoom) {
    resetLightboxZoomState();
  } else {
    state.lightboxBaseWidth = 0;
    state.lightboxBaseHeight = 0;
    resetLightboxStageScroll();
  }

  elements.mapImageLightboxPicture.src = url;
  elements.mapImageLightboxPicture.alt = accessibleLabel;

  setLightboxModeLabel(label);
  applyLightboxTheme(mode);
  setLightboxNavigationState();
  prepareLightboxZoom(preserveZoom);
  updateZoomButtonsState();
  return true;
}

function navigateLightbox(delta) {
  if (!state.isLightboxOpen || !Number.isFinite(delta)) return;
  const modes = Array.isArray(state.lightboxImageModes) ? state.lightboxImageModes : [];
  if (!modes.length) return;
  const currentIndex = modes.indexOf(state.lightboxActiveMode);
  if (currentIndex === -1) return;
  const nextIndex = currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= modes.length) return;
  const nextMode = modes[nextIndex];
  if (showLightboxImage(nextMode, { preserveZoom: true })) {
    setLightboxNavigationState();
  }
}

function handleLightboxPrevClick(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  navigateLightbox(-1);
}

function handleLightboxNextClick(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  navigateLightbox(1);
}

function openMapImageLightbox() {
  if (!canOpenMapImageLightbox() || !elements.mapImageLightbox || !elements.mapImageLightboxPicture) {
    return;
  }

  const availableModes = getAvailableLightboxModes();
  if (!availableModes.length) {
    return;
  }

  const currentMode = MAP_MODES[state.currentMapMode]?.type === 'image'
    && availableModes.includes(state.currentMapMode)
      ? state.currentMapMode
      : availableModes[0];

  state.lightboxReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  state.lightboxImageModes = availableModes;
  state.isLightboxOpen = true;

  if (!showLightboxImage(currentMode)) {
    state.isLightboxOpen = false;
    state.lightboxImageModes = [];
    state.lightboxActiveMode = '';
    updateZoomButtonsState();
    setLightboxNavigationState();
    return;
  }

  elements.mapImageLightbox.classList.remove('hidden');
  elements.mapImageLightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
  requestAnimationFrame(() => {
    elements.mapImageLightbox?.focus();
  });
}

function closeMapImageLightbox() {
  if (!state.isLightboxOpen) return;
  if (elements.mapImageLightbox) {
    elements.mapImageLightbox.classList.add('hidden');
    elements.mapImageLightbox.setAttribute('aria-hidden', 'true');
  }
  if (elements.mapImageLightboxPicture) {
    elements.mapImageLightboxPicture.src = '';
    elements.mapImageLightboxPicture.alt = '';
  }
  setLightboxModeLabel('');
  document.body.classList.remove('lightbox-open');
  state.isLightboxOpen = false;
  state.lightboxImageModes = [];
  state.lightboxActiveMode = '';
  setLightboxNavigationState();
  resetLightboxZoomState();
  if (state.lightboxReturnFocus instanceof HTMLElement) {
    state.lightboxReturnFocus.focus();
  }
  state.lightboxReturnFocus = null;
}

function handleMapImageClick(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  openMapImageLightbox();
}

function handleMapImageKeydown(event) {
  if (!event) return;
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    openMapImageLightbox();
  }
}

function handleLightboxBackdropClick(event) {
  if (!elements.mapImageLightbox || !event) return;
  if (event.target === elements.mapImageLightbox) {
    closeMapImageLightbox();
  }
}

function handleLightboxKeydown(event) {
  if (!state.isLightboxOpen || !event) return;
  if (event.key === '+' || event.key === '=' || event.key === 'Add') {
    event.preventDefault();
    adjustLightboxZoom(LIGHTBOX_ZOOM_STEP);
    return;
  }
  if (event.key === '-' || event.key === '_' || event.key === 'Subtract') {
    event.preventDefault();
    adjustLightboxZoom(-LIGHTBOX_ZOOM_STEP);
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    navigateLightbox(-1);
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    navigateLightbox(1);
    return;
  }
  if (event.key === 'Escape' || event.key === 'Esc') {
    event.preventDefault();
    closeMapImageLightbox();
  }
}

function getPreferredPreviewUrl(images) {
  if (!images || typeof images !== 'object') return '';
  for (const key of ['lokalizacja', 'teren', 'media', 'mpzp', 'mpzpskan', 'studium', 'uzytkigruntowe']) {
    const candidate = images[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  const fallback = Object.values(images)
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .find(value => value);
  return fallback || '';
}

function updatePlotPreviewImage(images) {
  const img = elements.plotPreviewImage;
  const placeholder = elements.plotPreviewPlaceholder;
  if (!img || !placeholder) return;
  const url = getPreferredPreviewUrl(images);
  if (url) {
    img.src = url;
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    img.src = '';
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
}

function updateMapImages(images) {
  const nextImages = images && typeof images === 'object' && !Array.isArray(images)
    ? { ...images }
    : {};
  state.mapImages = nextImages;
  updatePlotPreviewImage(nextImages);
  elements.mapModeButtons.forEach(btn => {
    const mode = btn.dataset.mode;
    const config = MAP_MODES[mode];
    if (config?.type === 'image') {
      const hasImage = Boolean(state.mapImages[config.key]);
      btn.classList.toggle('is-disabled', !hasImage);
      if (!hasImage) {
        btn.setAttribute('title', 'Brak obrazu dla tej warstwy');
      } else {
        btn.removeAttribute('title');
      }
    } else {
      btn.classList.remove('is-disabled');
      btn.removeAttribute('title');
    }
  });
  if (!state.currentMapMode) {
    state.currentMapMode = MAP_MODE_DEFAULT;
  }
  setMapMode(state.currentMapMode);
  if (state.isLightboxOpen) {
    state.lightboxImageModes = getAvailableLightboxModes();
    if (!state.lightboxImageModes.length) {
      closeMapImageLightbox();
    } else if (!state.lightboxImageModes.includes(state.lightboxActiveMode)) {
      showLightboxImage(state.lightboxImageModes[0], { preserveZoom: true });
    } else {
      setLightboxNavigationState();
    }
  }
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

function updateMapSectionArchivedState() {
  if (!elements.mapSection) return;
  elements.mapSection.classList.toggle('is-archived', Boolean(state.isArchived));
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

function buildShareUrl() {
  try {
    const url = new URL(window.location.href);
    url.hash = '';
    return url.toString();
  } catch (error) {
    return window.location.href.split('#')[0];
  }
}

function fallbackCopyShareUrl() {
  if (!elements.shareLinkInput) return false;
  if (typeof document.execCommand !== 'function') return false;
  try {
    const input = elements.shareLinkInput;
    input.focus();
    input.select();
    const success = document.execCommand('copy');
    input.setSelectionRange(0, 0);
    input.blur();
    return Boolean(success);
  } catch (error) {
    return false;
  }
}

function updateShareLinks(title, location) {
  const shareUrl = buildShareUrl();
  state.shareUrl = shareUrl;
  if (elements.shareLinkInput) {
    elements.shareLinkInput.value = shareUrl;
  }

  const shareTitle = textContentOrFallback(title, 'Oferta działki');
  const locationText = typeof location === 'string' ? location.trim() : '';
  const normalizedLocation = locationText && locationText.toLowerCase() !== 'polska'
    ? locationText
    : '';
  const shareText = normalizedLocation ? `${shareTitle} – ${normalizedLocation}` : shareTitle;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(shareText);

  if (elements.shareMessenger) {
    elements.shareMessenger.href = `https://www.messenger.com/t/?link=${encodedUrl}&text=${encodedShareText}`;
  }
  if (elements.shareWhatsapp) {
    const whatsappMessage = `${shareText} ${shareUrl}`.trim();
    elements.shareWhatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
  }
  if (elements.shareX) {
    elements.shareX.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedShareText}`;
  }
  if (elements.shareFacebook) {
    elements.shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
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
  elements.priceUpdatedAt.textContent = formatted ? `Aktualizacja: ${formatted}` : 'Aktualizacja: ';
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
  state.isArchived = false;
  updateMapSectionArchivedState();
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
  const title = pickValue(plot.title, plot.name, plot.Id);
  elements.propertyTitle.textContent = textContentOrFallback(title, 'Działka');
  document.title = `Grunteo - ${textContentOrFallback(title, 'Działka')}`;

  const location = pickValue(plot.location, plot.city, data.city, data.location);
  setTextContent(elements.propertyLocation, location, '');

  const propertyType = pickValue(plot.propertyType, plot.type, data.propertyType);
  setTextContent(elements.propertyType, propertyType, '');

  const ownership = pickValue(plot.ownershipStatus, plot.ownership, data.ownershipStatus);
  setTextContent(elements.ownershipStatus, ownership, '');

  const priceRaw = pickValue(plot.price, data.price);
  const price = parseNumberFromText(priceRaw);
  setPrice(price);

  const areaRaw = pickValue(plot.pow_dzialki_m2_uldk, plot.area, plot.surface, data.area);
  const area = parseNumberFromText(areaRaw);
  setArea(area);

  renderPriceMetadata(pickValue(plot.priceUpdatedAt, data.updatedAt, data.timestamp));

  const plotNumberValue = pickValue(plot.plotNumber, plot.Id, plot.number);
  setTextContent(elements.plotNumber, extractPlotNumberSegment(plotNumberValue), '');
  setTextContent(elements.landRegister, pickValue(plot.landRegister, plot.kwNumber, plot.landRegistry, plot.numer_kw), '');
  const rawStatus = pickValue(plot.status, plot.offerStatus, data.status);
  const baseStatus = textContentOrFallback(rawStatus, '');
  const finalStatus = state.isArchived
    ? (baseStatus ? `${baseStatus} · Dane archiwalne` : 'Dane archiwalne')
    : baseStatus;
  setTextContent(elements.plotStatus, finalStatus, '');

  updateMapSectionArchivedState();

  setMultilineText(elements.locationAddress, pickValue(plot.locationAddress, data.address, plot.address), '');
  setRichTextContent(elements.locationAccess, pickValue(plot.locationAccess, plot.access, data.access), '');

  renderPlanBadges(pickValue(plot.planBadges, data.planBadges));
  setTextContent(elements.planDesignation, pickValue(plot.planDesignation, plot.planUsage, data.planDesignation), '');
  setTextContent(elements.planHeight, pickValue(plot.planHeight, data.planHeight), '');
  setTextContent(elements.planIntensity, pickValue(plot.planIntensity, data.planIntensity), '');
  setTextContent(elements.planGreen, pickValue(plot.planGreen, data.planGreen), '');
  setRichTextContent(elements.planNotes, pickValue(plot.planNotes, data.planNotes), '');

  updateMapImages(collectMapImages(plot, data, state.plotIndex, state.offerId));

  const utilities = mergeUtilities(data.utilities, plot.utilities);
  renderUtilities(utilities);

  setRichTextContent(elements.descriptionText, pickValue(plot.description, data.description), '');

  renderTags(pickValue(plot.tags, data.tags));

  const contactName = pickValue(plot.contactName, data.contactName, data.firstName, 'Właściciel');
  setTextContent(elements.contactName, contactName, 'Właściciel');

  const phone = pickValue(plot.contactPhone, data.contactPhone, data.phone);
  setContactLink(elements.contactPhoneLink, phone, 'phone');

  const email = pickValue(plot.contactEmail, data.contactEmail, data.email);
  setContactLink(elements.contactEmailLink, email, 'email');

  updateShareLinks(title, location);
  updateSaveButtonState();
}

function setMapMode(mode) {
  const targetMode = MAP_MODES[mode] ? mode : MAP_MODE_DEFAULT;
  const config = MAP_MODES[targetMode] || MAP_MODES[MAP_MODE_DEFAULT];
  state.currentMapMode = targetMode;
  setActiveMapButton(targetMode);
  if (config.type === 'image') {
    showMapImage(config.key, getMapModeLabel(targetMode));
  } else {
    showMapCanvas(config.mapType);
  }
}

function handleMapImageError() {
  if (!elements.mapImageElement || !elements.mapImagePlaceholder) return;
  const label = elements.mapImageElement.dataset?.layerLabel;
  const name = label ? `warstwy „${label}”` : 'tej warstwy';
  elements.mapImageElement.src = '';
  elements.mapImageElement.alt = '';
  elements.mapImageElement.classList.add('hidden');
  elements.mapImageElement.classList.remove('is-interactive');
  elements.mapImageElement.removeAttribute('tabindex');
  elements.mapImageElement.removeAttribute('role');
  elements.mapImageElement.removeAttribute('aria-label');
  elements.mapImagePlaceholder.textContent = `Brak obrazu dla ${name}.`;
  elements.mapImagePlaceholder.classList.remove('hidden');
}

function setupMapModeButtons() {
  elements.mapModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
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
  const markerTitle = state.isArchived ? `${title} (dane archiwalne)` : title;
  const markerOptions = {
    map: state.map,
    position: center,
    title: markerTitle
  };
  if (state.isArchived) {
    markerOptions.icon = { ...ARCHIVED_MARKER_SYMBOL };
    markerOptions.zIndex = 1000;
  }
  state.marker = new google.maps.Marker(markerOptions);
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

  setMapMode(state.currentMapMode || MAP_MODE_DEFAULT);
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

function setupShareActions() {
  const initialUrl = buildShareUrl();
  state.shareUrl = initialUrl;

  if (elements.shareLinkInput) {
    elements.shareLinkInput.value = initialUrl;
    const selectInput = (event) => {
      event.target.select();
    };
    elements.shareLinkInput.addEventListener('focus', selectInput);
    elements.shareLinkInput.addEventListener('click', selectInput);
  }

  if (elements.shareCopyBtn) {
    elements.shareCopyBtn.addEventListener('click', async () => {
      if (!state.shareUrl) {
        state.shareUrl = buildShareUrl();
        if (elements.shareLinkInput) {
          elements.shareLinkInput.value = state.shareUrl;
        }
      }

      const urlToCopy = state.shareUrl;
      if (!urlToCopy) {
        showToast('Link nie jest dostępny.', 'warning');
        return;
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(urlToCopy);
          showToast('Skopiowano link do oferty.', 'success');
          return;
        }
      } catch (error) {
        console.warn('Nie udało się skopiować linku za pomocą schowka.', error);
      }

      if (fallbackCopyShareUrl()) {
        showToast('Skopiowano link do oferty.', 'success');
      } else {
        showToast('Nie udało się skopiować linku. Skopiuj go ręcznie.', 'error');
      }
    });
  }

  updateShareLinks('Oferta działki', null);
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

function resetFavoritesState() {
  state.favorites = [];
  state.favoritesLoadedAt = 0;
  state.favoritesLoadingPromise = null;
}

async function refreshUserFavorites(userId) {
  const { db } = initFirebase();
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : {};
  const favorites = Array.isArray(data.favorites) ? data.favorites : [];
  state.favorites = favorites;
  state.favoritesLoadedAt = Date.now();
  return favorites;
}

async function ensureUserFavorites({ force = false } = {}) {
  const user = state.user;
  if (!user) {
    resetFavoritesState();
    return state.favorites;
  }

  const now = Date.now();
  if (!force && state.favoritesLoadedAt && (now - state.favoritesLoadedAt) < FAVORITES_CACHE_TTL_MS) {
    return state.favorites;
  }

  if (state.favoritesLoadingPromise) {
    return state.favoritesLoadingPromise;
  }

  const loadPromise = (async () => {
    try {
      return await refreshUserFavorites(user.uid);
    } catch (error) {
      console.error('ensureUserFavorites', error);
      resetFavoritesState();
      throw error;
    }
  })().finally(() => {
    state.favoritesLoadingPromise = null;
  });

  state.favoritesLoadingPromise = loadPromise;
  return loadPromise;
}

async function loadUserFavorites(user) {
  if (!user) {
    resetFavoritesState();
    updateSaveButtonState();
    return;
  }
  try {
    await ensureUserFavorites({ force: true });
  } catch (error) {
    console.error('loadUserFavorites', error);
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
    await ensureUserFavorites().catch((error) => {
      const wrapped = new Error('FAVORITES_FETCH_FAILED');
      wrapped.cause = error;
      throw wrapped;
    });

    if (isCurrentPlotFavorite()) {
      showToast('Ta działka jest już na liście ulubionych.', 'info');
      return;
    }

    const entry = buildFavoriteEntry();
    const updatedFavorites = [...state.favorites, entry];
    await setDoc(userRef, { favorites: updatedFavorites }, { merge: true });
    state.favorites = updatedFavorites;
    state.favoritesLoadedAt = Date.now();
    showToast('Dodano działkę do ulubionych.', 'success');
  } catch (error) {
    console.error('handleSaveFavorite', error);
    if (error?.message === 'FAVORITES_FETCH_FAILED') {
      showToast('Nie udało się odczytać listy ulubionych. Spróbuj ponownie.', 'error');
    } else {
      showToast('Nie udało się zapisać działki. Spróbuj ponownie.', 'error');
    }
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
    resetFavoritesState();
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
  const { auth, db } = initFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const niceAuthError = (error) => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Nieprawidłowy adres e-mail.';
      case 'auth/missing-password':
        return 'Podaj hasło.';
      case 'auth/invalid-credential':
        return 'Nieprawidłowy e-mail lub hasło.';
      case 'auth/user-not-found':
        return 'Użytkownik nie istnieje.';
      case 'auth/wrong-password':
        return 'Błędne hasło.';
      case 'auth/too-many-requests':
        return 'Za dużo prób. Spróbuj ponownie później.';
      case 'auth/unauthorized-domain':
        return `Domena ${location.hostname} nie jest autoryzowana w Firebase (Authentication → Authorized domains).`;
      case 'auth/network-request-failed':
        return 'Błąd sieci. Sprawdź połączenie z internetem.';
      case 'auth/popup-closed-by-user':
        return 'Zamykanie okna logowania przerwało proces.';
      case 'auth/cancelled-popup-request':
        return 'Logowanie zostało przerwane przez inne żądanie. Spróbuj ponownie.';
      case 'auth/popup-blocked':
        return 'Przeglądarka zablokowała okno logowania Google. Użyj przekierowania.';
      case 'auth/operation-not-supported-in-this-environment':
        return 'To środowisko nie wspiera tego typu logowania (np. file://). Uruchom stronę przez https.';
      default:
        return `Błąd: ${code || error?.message || 'nieznany'}`;
    }
  };

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
    const form = event.target;
    const email = form.loginEmail?.value?.trim();
    const password = form.loginPassword?.value;
    if (form.loginEmail && typeof email === 'string') {
      form.loginEmail.value = email;
    }
    if (!email || !password) {
      showToast('Podaj adres email i hasło.', 'warning');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Zalogowano pomyślnie.', 'success');
      closeModal(elements.loginModal);
      form.reset();
    } catch (error) {
      console.error('[login]', error);
      showToast(niceAuthError(error), 'error');
    }
  });

  elements.registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const nameRaw = form.registerName?.value ?? '';
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
    const email = form.registerEmail?.value?.trim();
    const password = form.registerPassword?.value;
    const confirmPassword = form.registerConfirmPassword?.value;

    if (form.registerName && typeof name === 'string') {
      form.registerName.value = name;
    }
    if (form.registerEmail && typeof email === 'string') {
      form.registerEmail.value = email;
    }

    if (!name) {
      showToast('Podaj imię i nazwisko.', 'warning');
      form.registerName?.focus();
      return;
    }
    if (!email || !password) {
      showToast('Podaj adres email i hasło.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Hasła nie są identyczne!', 'error');
      return;
    }

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      try {
        if (name) {
          await updateProfile(user, { displayName: name });
        }
      } catch (profileError) {
        console.warn('[register][profile]', profileError);
      }

      try {
        await setDoc(doc(db, 'users', user.uid), {
          name: name || null,
          email,
          createdAt: new Date(),
          provider: 'password'
        }, { merge: true });
      } catch (firestoreError) {
        console.error('[register][setDoc]', firestoreError);
      }

      let message = 'Konto zostało utworzone.';
      let type = 'success';
      try {
        await sendEmailVerification(user);
        message = 'Konto zostało utworzone. Sprawdź skrzynkę pocztową, aby potwierdzić adres e-mail.';
      } catch (verificationError) {
        console.error('[register][verification]', verificationError);
        message = 'Konto zostało utworzone, ale nie udało się wysłać wiadomości weryfikacyjnej.';
        type = 'warning';
      }

      showToast(message, type);
      closeModal(elements.registerModal);
      form.reset();
    } catch (error) {
      console.error('[register]', error);
      showToast(niceAuthError(error), 'error');
    }
  });

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      showToast('Zalogowano przez Google.', 'success');
      closeModal(elements.loginModal);
      closeModal(elements.registerModal);
    } catch (error) {
      console.error('[google]', error);
      showToast(niceAuthError(error), 'error');
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
  try {
    state.isArchived = false;
    let data = getCachedPropertyListing(state.offerId);
    if (!data) {
      const { db } = initFirebase();
      const offerRef = doc(db, 'propertyListings', state.offerId);
      const snap = await getDoc(offerRef);
      if (!snap.exists()) {
        showError('Ogłoszenie nie istnieje lub zostało usunięte.');
        return;
      }
      data = snap.data();
      setCachedPropertyListing(state.offerId, data);
    }
    const plots = Array.isArray(data.plots) ? data.plots : [];
    const plot = plots[state.plotIndex];
    if (!plot) {
      showError('Nie odnaleziono wskazanej działki.');
      return;
    }
    state.isArchived = data.mock === false || plot.mock === false;
    state.offerData = data;
    state.plotData = plot;
    state.currentMapMode = MAP_MODE_DEFAULT;
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
  ensureMapStateFocusHint(state.offerId, state.plotIndex);
  initFirebase();
  setupAuthUI();
  setupMapModeButtons();
  setupInquiryForm();
  setupShareActions();
  setupSaveButton();
  await loadProperty();
}

init();
