import { useEffect } from 'react';

const loadedScripts = new Set();

export function useLegacyScript(src, { module = false, async = true, defer = false, id, attrs = {} } = {}) {
  useEffect(() => {
    if (!src || loadedScripts.has(src)) {
      return undefined;
    }

    const script = document.createElement('script');
    script.src = src;
    script.type = module ? 'module' : 'text/javascript';
    script.async = async;
    script.defer = defer;
    if (id) {
      script.id = id;
    }
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === true) {
        script.setAttribute(key, '');
      } else if (value !== false && value != null) {
        script.setAttribute(key, value);
      }
    });

    document.body.appendChild(script);
    loadedScripts.add(src);

    return () => {
      // Legacy scripts register global side-effects. We intentionally keep them loaded.
    };
  }, [src, module, async, defer, id, attrs]);
}
