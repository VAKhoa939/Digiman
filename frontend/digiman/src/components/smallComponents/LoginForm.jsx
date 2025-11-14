import React, { useRef, useEffect, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';

const LoginModal = ({ show, onClose, onLogin, onSwitchToRegister }) => {
  const modalRef = useRef(null);
  const [bsModal, setBsModal] = useState(null);

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
    onLogin({ identifier, password, rememberMe });
    onClose();
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
        <div className="modal-content bg-dark text-white">
          <div className="modal-header justify-content-center position-relative">
            <h5 className="modal-title mb-0" id="loginModalLabel">Login your account</h5>
            <button type="button" className="btn-close position-absolute end-0 top-50 translate-middle-y" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="identifier" className="form-label">Email or username</label>
                <input type="text" className="form-control" id="identifier" aria-describedby="emailHelp" name="identifier" placeholder="Email or username"
  autoComplete="username" required />
                <small id="emailHelp" className="form-text text-secondary">We'll never share your email with anyone else.</small>
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input type="password" className="form-control" id="password" name="password" required />
              </div>
    <fieldset>
      <div className="form-check">
        <input className="form-check-input" type="checkbox" value="" id="rememberMe"/>
        <label className="form-check-label" htmlFor="rememberMe">
          Remember me
        </label>
      </div>
    </fieldset>
    <div>
        <button type="submit" className="btn btn-primary w-100">Login</button>
              <a href="#" className="text-decoration-none text-secondary">Forgot password?</a>
              </div>
              
              <div className="text-center mt-3">
                <a
                  href="#"
                  className="text-decoration-none text-primary ms-3"
                  onClick={(e) => {
                    e.preventDefault();
                    // When using modal-as-route, just navigate to the register route.
                    // App will render the register modal and preserve the background location.
                    onSwitchToRegister && onSwitchToRegister();
                  }}
                >
                  New User? Register
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
