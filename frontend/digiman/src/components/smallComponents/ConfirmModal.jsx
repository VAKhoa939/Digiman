import React, { useEffect } from 'react';

const ConfirmModal = ({
  show,
  onClose,
  onConfirm,
  title = 'Confirm',
  body,
  footer,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'btn-primary',
  loading = false,
  loadingLabel = 'Processing…',
}) => {
  useEffect(() => {
    if (!show) return;
    function onKey(e) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onClose, loading]);

  if (!show) return null;

  return (
    <div>
      <div className="modal-backdrop fade show" onClick={loading ? undefined : onClose} />
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={loading} />
            </div>
            <div className="modal-body">{body}</div>
            <div className="modal-footer">
              {footer || (
                <>
                  <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                    {cancelLabel}
                  </button>
                  <button type="button" className={`btn ${confirmVariant}`} onClick={onConfirm} disabled={loading}>
                    {loading ? loadingLabel : confirmLabel}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
