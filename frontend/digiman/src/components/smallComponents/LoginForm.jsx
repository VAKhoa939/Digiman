import React, { useRef, useEffect, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const LoginModal = ({ show, onClose, onSwitchToRegister }) => {
  const modalRef = useRef(null);
  const [bsModal, setBsModal] = useState(null);
  const { login } = useAuth();
  const { theme } = useTheme()

  useEffect(() => {
    if (!modalRef.current) return;
    const el = modalRef.current;
    // allow closing by clicking backdrop and by Esc key
    const instance = new Modal(el, { backdrop: true, keyboard: true });
    setBsModal(instance);

    const onHidden = () => {
      // Only notify parent to navigate back when the URL still points to this modal's route.
      // This avoids navigating back when we intentionally switch to another modal route
      // (for example: /login -> /register).
      try {
        if (window && window.location && window.location.pathname === '/login') {
          onClose && onClose();
        }
      } catch (e) {
        // fallback: if window isn't available for some reason, call onClose
        onClose && onClose();
      }
    };
    el.addEventListener('hidden.bs.modal', onHidden);

    return () => {
      el.removeEventListener('hidden.bs.modal', onHidden);
      instance.dispose();
    };
  }, []);

  useEffect(() => {
    if (bsModal) {
      console.log('Modal instance active:', bsModal);
      show ? bsModal.show() : bsModal.hide();
    }
  }, [show, bsModal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const identifier = e.target.identifier.value.trim();
    const password = e.target.password.value;
    const rememberMe = e.target.rememberMe.checked;
    const result = login(identifier, password, rememberMe);
    if (result) onClose();
  };

  return (
    <div
      className="modal fade"
      ref={modalRef}
      tabIndex="-1"
      aria-labelledby="loginModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
          <div className={`modal-content ${theme === 'dark' ? 'bg-dark text-white' : 'bg-light text-dark'}`}>
            <div className="modal-header justify-content-center position-relative border-0">
              <h5 className="modal-title mb-0" id="loginModalLabel">Login to your account</h5>
              <button
                type="button"
                className={`btn-close position-absolute end-0 top-50 translate-middle-y ${theme === 'dark' ? 'btn-close-white' : ''}`}
                onClick={onClose}
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="identifier" className="form-label">Email or username</label>
                  <input type="text" className="form-control form-control-lg" id="identifier" aria-describedby="emailHelp" name="identifier" placeholder="Email or username"
    autoComplete="username" required />
                  <small id="emailHelp" className={`form-text ${theme === 'dark' ? 'text-secondary' : 'text-muted'}`}>We'll never share your email with anyone else.</small>
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                  <input type="password" className="form-control form-control-lg" id="password" name="password" required />
              </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="form-check mb-0">
                    <input className="form-check-input" type="checkbox" value="" id="rememberMe"/>
                    <label className="form-check-label ms-2" htmlFor="rememberMe">Remember me</label>
                  </div>
                  <a href="#" className={`text-decoration-none ${theme === 'dark' ? 'text-secondary' : 'text-muted'}`}>Forgot password?</a>
                </div>

                <div className="d-grid">
                  <button type="submit" className="btn btn-primary btn-lg">Login</button>
                </div>

                <hr className={`my-3 ${theme === 'dark' ? 'border-top border-secondary' : ''}`} />

                <div className="text-center">
                  <a
                    href="#"
                    className="text-decoration-none text-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      onSwitchToRegister && onSwitchToRegister();
                    }}
                  >
                    New user? Register
                  </a>
                </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
