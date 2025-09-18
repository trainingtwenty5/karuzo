(function(){
  const CONSENT_KEY = 'grunteo-cookie-consent';
  const GA_ID = 'G-VH07LRZ8GK';
  const CONSENT_STATES = {
    ACCEPTED: 'accepted',
    NECESSARY: 'necessary'
  };

  const storage = {
    get(){
      try{
        return localStorage.getItem(CONSENT_KEY);
      }catch(err){
        return null;
      }
    },
    set(value){
      try{
        localStorage.setItem(CONSENT_KEY, value);
      }catch(err){
        /* ignore */
      }
    }
  };

  const ensureConsentDefaults = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    });
  };

  const loadScript = (src, attrs = {}) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      Object.entries(attrs).forEach(([key, value]) => {
        if (value === true){
          script.setAttribute(key, '');
        }else if (value !== false && value != null){
          script.setAttribute(key, value);
        }
      });
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const initAnalytics = () => {
    if (window.__grunteoAnalyticsLoaded) return;
    window.__grunteoAnalyticsLoaded = true;

    loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`, { async: true });

    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });

    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments);};
      h._hjSettings={hjid:6523622,hjsv:6};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  };

  const applyConsentState = (state) => {
    const banner = document.querySelector('[data-cookie-banner]');
    const manageTrigger = document.querySelector('[data-cookie-preferences]');

    if (manageTrigger){
      if (state){
        manageTrigger.hidden = false;
      }else{
        manageTrigger.hidden = true;
      }
    }

    if (state === CONSENT_STATES.ACCEPTED){
      window.gtag('consent', 'update', {
        ad_storage: 'granted',
        analytics_storage: 'granted'
      });
      initAnalytics();
      if (manageTrigger){
        manageTrigger.setAttribute('aria-expanded', 'false');
      }
    }else{
      window['ga-disable-' + GA_ID] = true;
      window.gtag('consent', 'update', {
        ad_storage: 'denied',
        analytics_storage: 'denied'
      });
      if (typeof window.hj === 'function'){
        window.hj('event', 'consent_withdrawn');
      }
      if (manageTrigger){
        manageTrigger.setAttribute('aria-expanded', 'false');
      }
    }
  };

  const hideBanner = () => {
    const banner = document.querySelector('[data-cookie-banner]');
    if (!banner) return;
    banner.classList.add('cookie-banner--hidden');
    banner.setAttribute('aria-hidden', 'true');
    banner.setAttribute('aria-modal', 'false');
    const manageTrigger = document.querySelector('[data-cookie-preferences]');
    manageTrigger?.setAttribute('aria-expanded', 'false');
  };

  const showBanner = () => {
    const banner = document.querySelector('[data-cookie-banner]');
    if (!banner) return;
    banner.classList.remove('cookie-banner--hidden');
    banner.setAttribute('aria-hidden', 'false');
    banner.setAttribute('aria-modal', 'true');
    banner.focus({ preventScroll: true });
    const manageTrigger = document.querySelector('[data-cookie-preferences]');
    manageTrigger?.setAttribute('aria-expanded', 'true');
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensureConsentDefaults();

    const banner = document.querySelector('[data-cookie-banner]');
    if (!banner) return;

    const acceptBtn = banner.querySelector('[data-cookie-accept]');
    const declineBtn = banner.querySelector('[data-cookie-decline]');
    const manageTrigger = document.querySelector('[data-cookie-preferences]');

    const storedState = storage.get();
    if (storedState){
      hideBanner();
      applyConsentState(storedState);
    }else{
      banner.setAttribute('aria-hidden', 'false');
      banner.setAttribute('aria-modal', 'true');
    }

    acceptBtn?.addEventListener('click', () => {
      storage.set(CONSENT_STATES.ACCEPTED);
      hideBanner();
      applyConsentState(CONSENT_STATES.ACCEPTED);
    });

    declineBtn?.addEventListener('click', () => {
      storage.set(CONSENT_STATES.NECESSARY);
      hideBanner();
      applyConsentState(CONSENT_STATES.NECESSARY);
    });

    manageTrigger?.addEventListener('click', () => {
      showBanner();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !banner.classList.contains('cookie-banner--hidden')){
        hideBanner();
        if (manageTrigger){
          manageTrigger.focus();
        }
      }
    });
  });
})();
