
import React, { useRef, useEffect } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const LoginModal = ({ onClose, onSwitchToRegister }) => {
  const modalRef = useRef(null);
  const bsRef = useRef(null);
  const closingByUserRef = useRef(false);
  const { login } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (!modalRef.current || bsRef.current) return;
    const el = modalRef.current;
    // initialize Bootstrap modal. Delay `show()` slightly so the
    // element is guaranteed to be attached to the DOM and React has
    // completed any layout work. This prevents intermittent
    // `Cannot read properties of null (reading 'style')` from
    // Bootstrap when the modal element isn't yet available.
    bsRef.current = new Modal(el, { backdrop: true, keyboard: true });
    setTimeout(() => {
      try {
        if (modalRef.current && bsRef.current) bsRef.current.show();
      } catch (err) {
        // Log the error and the current ref to help debugging
        // instead of letting the exception bubble to the window.
        // eslint-disable-next-line no-console
        console.error('LoginModal: failed to show modal', err, { modalRef: modalRef.current });
        try { bsRef.current?.dispose(); } catch (_) {}
        bsRef.current = null;
      }
    }, 0);

    const onHidden = () => {
      try { bsRef.current?.dispose(); } catch (e) {}
      bsRef.current = null;
      if (closingByUserRef.current) {
        closingByUserRef.current = false;
        onClose?.();
        return;
      }
      onClose?.();
    };

    el.addEventListener('hidden.bs.modal', onHidden);

    return () => {
      el.removeEventListener('hidden.bs.modal', onHidden);
      try { if (bsRef.current) { try { bsRef.current.hide(); } catch (e) {} try { bsRef.current.dispose(); } catch (e) {} bsRef.current = null; } } catch (e) {}
      try { document.body.classList.remove('modal-open'); } catch (e) {}
      try { document.body.style.overflow = ''; document.body.style.paddingRight = ''; } catch (e) {}
      try { document.querySelectorAll('.modal-backdrop').forEach(n => n.remove()); } catch (e) {}
      try {
        // Defensive: remove stray text nodes that may have been appended as the string 'null'
        document.body.childNodes.forEach(n => {
          if (n && n.nodeType === Node.TEXT_NODE && n.nodeValue && n.nodeValue.trim() === 'null') n.remove();
        });
      } catch (e) {}
    };
  }, []);

  const requestNavigate = () => {
    closingByUserRef.current = true;
    if (bsRef.current) bsRef.current.hide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const identifier = e.target.identifier.value.trim();
    const password = e.target.password.value;
    const rememberMe = e.target.rememberMe?.checked || false;
    const result = await login(identifier, password, rememberMe);
    if (result) requestNavigate();
  };

  return (
    <div className="modal fade" ref={modalRef} tabIndex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className={`modal-content ${theme === 'dark' ? 'bg-dark text-white' : 'bg-light text-dark'}`}>
          <div className="modal-header justify-content-center position-relative border-0">
            <h5 className="modal-title mb-0" id="loginModalLabel">Login to your account</h5>
            <button type="button" className={`btn-close position-absolute end-0 top-50 translate-middle-y ${theme === 'dark' ? 'btn-close-white' : ''}`} onClick={requestNavigate} aria-label="Close" />
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="identifier" className="form-label">Email or username</label>
                <input type="text" className="form-control form-control-lg" id="identifier" aria-describedby="emailHelp" name="identifier" placeholder="Email or username" autoComplete="username" required />
                <small id="emailHelp" className={`form-text ${theme === 'dark' ? 'text-secondary' : 'text-muted'}`}>We'll never share your email with anyone else.</small>
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input type="password" className="form-control form-control-lg" id="password" name="password" required />
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="form-check mb-0">
                  <input className="form-check-input" type="checkbox" value="" id="rememberMe" name="rememberMe"/>
                  <label className="form-check-label ms-2" htmlFor="rememberMe">Remember me</label>
                </div>
                <a href="#" className={`text-decoration-none ${theme === 'dark' ? 'text-secondary' : 'text-muted'}`}>Forgot password?</a>
              </div>
              <div className="d-grid">
                <button type="submit" className="btn btn-primary btn-lg">Login</button>
              </div>
              <hr className={`my-3 ${theme === 'dark' ? 'border-top border-secondary' : ''}`} />
              <div className="text-center">
                <a href="#" className="text-decoration-none text-primary" onClick={(e) => { e.preventDefault(); onSwitchToRegister && onSwitchToRegister(); }}>New user? Register</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
