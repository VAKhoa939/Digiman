// Small helper to emit application toasts via the global CustomEvent
export function emitToast(type, message) {
  try {
    window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type, message } }));
  } catch (e) {
    // best-effort: fall back to console if dispatch fails
    console.warn('emitToast failed', e, type, message);
  }
}

export function toastSuccess(message){ emitToast('success', message) }
export function toastError(message){ emitToast('error', message) }
export function toastInfo(message){ emitToast('info', message) }

export default emitToast
