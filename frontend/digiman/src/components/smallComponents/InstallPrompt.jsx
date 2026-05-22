import React from 'react';
import useInstallPrompt from '../../customHooks/useInstallPrompt';

export default function InstallPrompt() {
  const { isInstallable, isIOS, handleInstall, handleDismiss } = useInstallPrompt();

  // Only show on mobile viewport widths
  const isMobileWidth =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  if ((!isInstallable && !isIOS) || !isMobileWidth) return null;

  return (
    <div
      className="p-3 shadow border-top"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'var(--bs-body-bg, #1a1a2e)',
        color: 'var(--bs-body-color, #ffffff)',
      }}
      role="dialog"
      aria-label="Install Digiman app"
    >
      <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-2">
        <div className="flex-grow-1">
          {isIOS ? (
            <p className="mb-0 small">
              Install <strong>Digiman</strong>: tap the <strong>Share</strong> button then{' '}
              <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="mb-0 small">
              Install <strong>Digiman</strong> for quick access from your home screen.
            </p>
          )}
        </div>

        <div className="d-flex gap-2 flex-shrink-0">
          {!isIOS && (
            <button className="btn btn-primary btn-sm" onClick={handleInstall}>
              Install app to Home Screen
            </button>
          )}
          <button className="btn btn-outline-secondary btn-sm" onClick={handleDismiss}>
            Continue using in browser
          </button>
        </div>
      </div>
    </div>
  );
}
