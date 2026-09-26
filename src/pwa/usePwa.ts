import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * PWA install + update state.
 *
 * The service worker is registered, and `beforeinstallprompt` captured, by the inline
 * script that scripts/build-pwa.mjs injects into index.html. That script stashes both on
 * `window` and fires `pwa:change`; this hook reads them. On native and in the dev server
 * (no service worker) everything stays false.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaWindow extends Window {
  __pwaInstallEvent?: BeforeInstallPromptEvent;
  __pwaRegistration?: ServiceWorkerRegistration;
}

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
const pwaWindow = (isWeb ? window : undefined) as PwaWindow | undefined;

export interface PwaState {
  /** Chromium: the browser's install prompt is available. */
  canInstall: boolean;
  /** iOS Safari: installing is only possible via Share → Add to Home Screen. */
  showIosInstallHint: boolean;
  /** A new version has been downloaded and is waiting to take over. */
  updateReady: boolean;
  install: () => Promise<void>;
  applyUpdate: () => void;
}

function isStandalone(): boolean {
  if (!isWeb) return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (!isWeb) return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return isIos && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function usePwa(): PwaState {
  const [canInstall, setCanInstall] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!pwaWindow) return;

    const watched = new WeakSet<ServiceWorkerRegistration>();

    const sync = () => {
      setCanInstall(!!pwaWindow.__pwaInstallEvent);

      const reg = pwaWindow.__pwaRegistration;
      if (!reg || watched.has(reg)) return;
      watched.add(reg);

      // A waiting worker only counts as an update if a previous version controls the page.
      const hasController = () => !!navigator.serviceWorker.controller;
      if (reg.waiting && hasController()) setUpdateReady(true);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && hasController()) setUpdateReady(true);
        });
      });
    };

    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') pwaWindow.__pwaRegistration?.update().catch(() => {});
    };

    const onInstalled = () => {
      pwaWindow.__pwaInstallEvent = undefined;
      setCanInstall(false);
    };

    sync();
    window.addEventListener('pwa:change', sync);
    window.addEventListener('appinstalled', onInstalled);
    document.addEventListener('visibilitychange', checkForUpdate);
    return () => {
      window.removeEventListener('pwa:change', sync);
      window.removeEventListener('appinstalled', onInstalled);
      document.removeEventListener('visibilitychange', checkForUpdate);
    };
  }, []);

  const install = useCallback(async () => {
    const event = pwaWindow?.__pwaInstallEvent;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    pwaWindow.__pwaInstallEvent = undefined;
    setCanInstall(false);
  }, []);

  const applyUpdate = useCallback(() => {
    const waiting = pwaWindow?.__pwaRegistration?.waiting;
    if (!waiting) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    });
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return {
    canInstall,
    showIosInstallHint: isIosSafari() && !isStandalone(),
    updateReady,
    install,
    applyUpdate,
  };
}

/** Keeps the browser chrome (address bar / status bar) in step with the active theme. */
export function setWebThemeColor(color: string): void {
  if (!isWeb) return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
  document.body.style.backgroundColor = color;
}
