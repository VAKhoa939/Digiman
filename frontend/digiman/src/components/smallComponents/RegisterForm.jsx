import React, { useRef, useEffect, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const RegisterModal = ({ onClose, onSwitchToLogin }) => {
  const modalRef = useRef(null);
  const bsRef = useRef(null);
  const closingByUserRef = useRef(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register } = useAuth();
  const { theme } = useTheme();


  useEffect(() => {
    if (!modalRef.current || bsRef.current) return;
    const el = modalRef.current;
    // allow closing by clicking backdrop and by Esc key
    bsRef.current = new Modal(el, { backdrop: true, keyboard: true });
    // Delay showing so the element is attached and layout finished.
    setTimeout(() => {
      try {
        if (modalRef.current && bsRef.current) bsRef.current.show();
      } catch (err) {
        // Log helpful info and clean up the bootstrap instance.
        // eslint-disable-next-line no-console
        console.error('RegisterModal: failed to show modal', err, { modalRef: modalRef.current });
        try { bsRef.current?.dispose(); } catch (_) {}
        bsRef.current = null;
      }
    }, 0);

    const onHidden = () => {
      try {
        bsRef.current?.dispose();
      } catch (e) {
        // ignore dispose errors
      } finally {
        bsRef.current = null;
      }

      // If this modal was explicitly closed by user or submit,
      // navigate back by history.
      if (closingByUserRef.current) {
        closingByUserRef.current = false;
        onClose?.();
        return;
      }

      // This covers cases where modal was closed by backdrop or ESC without explicit requestNavigate call.
      onClose?.();
    };

    el.addEventListener('hidden.bs.modal', onHidden);

    return () => {
      el.removeEventListener('hidden.bs.modal', onHidden);
      try {
        if (bsRef.current) {
          try { bsRef.current.hide(); } catch (e) {}
          try { bsRef.current.dispose(); } catch (e) {}
          bsRef.current = null;
        }
      } catch (e) { /* ignore */ }

      try {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      } catch (e) { /* ignore */ }
      try {
        // Defensive: remove stray text nodes that may have been appended as the string 'null'
        document.body.childNodes.forEach(n => {
          if (n && n.nodeType === Node.TEXT_NODE && n.nodeValue && n.nodeValue.trim() === 'null') n.remove();
        });
      } catch (e) { /* ignore */ }
    };
  }, []);

  const requestNavigate = () => {
    closingByUserRef.current = true;
    if (bsRef.current) bsRef.current.hide();
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const username = e.target.username.value;
    const rememberMe = e.target.rememberMe?.checked || false;
    
    // Validate passwords match before submitting
    if (!validatePasswords(password, confirmPassword)) {
      return; // Don't submit if passwords don't match
    }
    
    const result = await register(username, email, password, rememberMe);
    if (result) requestNavigate();
  };

  return (
    <div
      className="modal fade"
      ref={modalRef}
      tabIndex="-1"
      aria-labelledby="registerModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className={`modal-content ${theme === 'dark' ? 'bg-dark text-white' : 'bg-light text-dark'}`}>
          <div className="modal-header justify-content-center position-relative">
            <h5 className="modal-title mb-0" id="registerModalLabel">Register your new account</h5>
            <button 
              type="button" 
              className={`btn-close position-absolute end-0 top-50 translate-middle-y ${theme === 'dark' ? 'btn-close-white' : ''}`}
              onClick={requestNavigate} aria-label="Close" 
            />
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email address</label>
                <input type="email" className="form-control" id="email" aria-describedby="emailHelp" name="email" required />
                <small 
                  id="emailHelp" 
                  className={`form-text ${theme === 'dark' ? 'text-secondary' : 'text-muted'}`}
                >We'll never share your email with anyone else.</small>
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
                  <input className="form-check-input" type="checkbox" value="" id="rememberMe" name="rememberMe"/>
                  <label className="form-check-label" htmlFor="rememberMe">
                    Remember me
                  </label>
                </div>
              </fieldset>
              <div>
                <button type="submit" className="btn btn-primary w-100">Register</button>
              </div>

              <hr className={`my-3 ${theme === 'dark' ? 'border-top border-secondary' : ''}`} />
              
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