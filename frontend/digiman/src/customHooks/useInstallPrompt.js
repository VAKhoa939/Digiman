import { useState, useEffect, useRef } from 'react';

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function useInstallPrompt() {
  const deferredPrompt = useRef(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isInStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    // Already running as an installed PWA — nothing to show
    if (isInStandalone) {
      setIsInstalled(true);
      return;
    }

    // iOS Safari doesn't fire beforeinstallprompt; show manual instructions instead
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    if (isIOSDevice) {
      const dismissed = sessionStorage.getItem(DISMISSED_KEY);
      if (!dismissed) setIsIOS(true);
      return; // no beforeinstallprompt on iOS
    }

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      const dismissed = sessionStorage.getItem(DISMISSED_KEY);
      if (!dismissed) {
        deferredPrompt.current = e;
        setIsInstallable(true);
      }
    }

    function handleAppInstalled() {
      deferredPrompt.current = null;
      setIsInstallable(false);
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setIsInstallable(false);
    if (outcome === 'dismissed') {
      // User declined the native dialog — suppress the banner for this session
      sessionStorage.setItem(DISMISSED_KEY, '1');
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setIsInstallable(false);
    setIsIOS(false);
  }

  return { isInstallable, isInstalled, isIOS, handleInstall, handleDismiss };
}
