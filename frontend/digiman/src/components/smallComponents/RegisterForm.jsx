import React, { useRef, useEffect, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { useAuth } from '../../context/AuthContext';

const RegisterModal = ({ show, onClose, onSwitchToLogin }) => {
  const modalRef = useRef(null);
  const [bsModal, setBsModal] = useState(null);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register } = useAuth();

  useEffect(() => {
    if (!modalRef.current) return;
    const el = modalRef.current;
    // allow closing by clicking backdrop and by Esc key
    const instance = new Modal(el, { backdrop: true, keyboard: true });
    setBsModal(instance);

    const onHidden = () => {
      // Only notify parent to navigate back when the URL still points to this modal's route.
      // This prevents navigating back when we intentionally route to /login while hiding this modal.
      try {
        if (window && window.location && window.location.pathname === '/register') {
          onClose && onClose();
        }
      } catch (e) {
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

  // Check if passwords match on input change
  const validatePasswords = (pass, confirmPass) => {
    const doMatch = pass === confirmPass;
    setPasswordMatch(doMatch);
    return doMatch;
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePasswords(newPassword, confirmPassword);
  };

  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    validatePasswords(password, newConfirmPassword);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const username = e.target.username.value;
    const rememberMe = e.target.rememberMe.checked;
    
    // Validate passwords match before submitting
    if (!validatePasswords(password, confirmPassword)) {
      return; // Don't submit if passwords don't match
    }
    
    const result = register(username, email, password, rememberMe);
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
        <div className="modal-content bg-dark text-white">
          <div className="modal-header justify-content-center position-relative">
            <h5 className="modal-title mb-0" id="loginModalLabel">Register your new account</h5>
            <button type="button" className="btn-close position-absolute end-0 top-50 translate-middle-y" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email address</label>
                <input type="email" className="form-control" id="email" aria-describedby="emailHelp" name="email" required />
                <small id="emailHelp" className="form-text text-secondary">We'll never share your email with anyone else.</small>
              </div>
              <div className="mb-3">
                <label htmlFor="username" className="form-label">Username</label>
                <input type="text" className="form-control" id="username" name="username" required />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  id="password" 
                  name="password" 
                  value={password}
                  onChange={handlePasswordChange}
                  required 
                />
              </div>
              <div className="mb-3">
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <input 
                  type="password" 
                  className={`form-control ${!passwordMatch ? 'is-invalid' : confirmPassword ? 'is-valid' : ''}`}
                  id="confirmPassword" 
                  name="confirmPassword" 
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required 
                />
                {!passwordMatch && (
                  <div className="invalid-feedback">
                    Passwords do not match
                  </div>
                )}
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
                <button type="submit" className="btn btn-primary w-100">Register</button>
              </div>
              
              <div className="text-center mt-3">
                <a
                  href="#"
                  className="text-decoration-none text-primary ms-3"
                  onClick={(e) => {
                    e.preventDefault();
                    // Navigate to the login route; App will render it as a modal and preserve background
                    onSwitchToLogin && onSwitchToLogin();
                  }}
                >
                  Already a User? Login here
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
