import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile as apiUpdateProfile } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';

export default function Settings() {
  const { user, isAuthenticated, fetchUser } = useAuth();
  const [tab, setTab] = useState('account');

  // Account
  const [displayName, setDisplayName] = useState('');
  const [emailUsername, setEmailUsername] = useState('');
  const [password, setPassword] = useState('');

  // Display
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme()
  const [theme, setTheme] = useState('Dark');
  const [filters, setFilters] = useState({ Suggestive: true, Safe: true, Erotica: true, Mature: true });

  useEffect(() => {
    // populate from auth user when available
    if (user) {
      setDisplayName(user.display_name || user.name || user.username || '');
      setEmailUsername(user.email || '');
    }

    try {
      // Prefer the ThemeContext value (keeps UI in sync with NavBar toggle)
      try {
        if (globalTheme) {
          setTheme(globalTheme.charAt(0).toUpperCase() + globalTheme.slice(1));
        } else {
          const raw = localStorage.getItem('profile_display');
          if (raw) {
            const d = JSON.parse(raw);
            if (d.theme) setTheme(d.theme);
            if (d.filters) setFilters(d.filters);
          }
        }
      } catch (err) {}
    } catch (err) { /* ignore */ }
  }, [user]);

  // Keep local select in sync when the global theme changes
  useEffect(() => {
    try {
      if (globalTheme) setTheme(globalTheme.charAt(0).toUpperCase() + globalTheme.slice(1))
    } catch (err) { /* ignore */ }
  }, [globalTheme])

  async function saveAccount(e) {
    e && e.preventDefault();
    const payload = { display_name: displayName, email: emailUsername };
    // Try to call backend; if it fails, save locally and show a message.
    try {
      if (!isAuthenticated) throw new Error('Not authenticated');
      await apiUpdateProfile(payload);
      try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'success', message: 'Account updated (server)' } })); } catch (_) {}
      // re-fetch user data if available
      try { await fetchUser(); } catch (e) { /* ignore */ }
    } catch (err) {
      // fallback: persist to localStorage
      try { localStorage.setItem('profile_account', JSON.stringify(payload)); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'info', message: 'Saved locally (server update failed or unavailable)' } })); } catch (_) {}
    }
    setPassword('');
  }

  async function saveDisplay(e) {
    e && e.preventDefault();
    const payload = { theme, filters };
    try { localStorage.setItem('profile_display', JSON.stringify(payload)); } catch (err) {}
    try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'success', message: 'Display settings saved' } })); } catch (_) {}
  }

  function toggleFilter(key) {
    setFilters(f => ({ ...f, [key]: !f[key] }));
  }

  return (
    <div className="container py-4">
      <div className="profile-container outline">
        <h2 style={{ fontSize: 32, marginBottom: 8 }}>User settings</h2>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div className="profile-left-nav">
            <div style={{ marginBottom: 18 }}>
              <div className={`profile-tab ${tab === 'account' ? 'active' : ''}`} onClick={() => setTab('account')}>
                <div className="icon">👤</div>
                <strong>Account</strong>
              </div>
              <div className={`profile-tab ${tab === 'display' ? 'active' : ''}`} onClick={() => setTab('display')}>
                <div className="icon">🌙</div>
                <strong>Display</strong>
              </div>
            </div>
          </div>

          <div className="profile-right">
            {tab === 'account' && (
              <div className="profile-section">
                <h4>Account</h4>
                <form onSubmit={saveAccount}>
                  <div className="mb-3">
                    <label className="form-label">Display name</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
                      <button type="submit" className="btn" style={{ background: '#FFD400', color: '#111' }}>Save</button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Change Email & Username</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-control" value={emailUsername} onChange={(e) => setEmailUsername(e.target.value)} placeholder="email / username" />
                      <button type="button" className="btn btn-outline-light" onClick={saveAccount}>Change Email & Username</button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Change Password</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
                      <button type="button" className="btn btn-outline-light" onClick={() => { try { window.dispatchEvent(new CustomEvent('digiman:toast', { detail: { type: 'success', message: 'Password change saved (mock)' } })); } catch (_) {} setPassword(''); }}>Change Password</button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {tab === 'display' && (
              <div className="profile-section">
                <h4>Theme</h4>
                <div className="mb-3" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{ minWidth: 80 }}>Theme</label>
                  <select className="form-select" value={theme} onChange={(e) => {
                      const next = e.target.value;
                      setTheme(next);
                      // Update the global theme via ThemeContext (keeps NavBar toggle in sync)
                      try { setGlobalTheme(next.toString().toLowerCase()) } catch (err) {}
                    }} style={{ width: 160 }}>
                    <option>Dark</option>
                    <option>Light</option>
                  </select>
                </div>

                <h4 style={{ marginTop: 18, marginBottom: 8 }}>Content Filter</h4>
                <div className="profile-content-filter" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  {Object.keys(filters).map(k => (
                    <label key={k}>
                      <input type="checkbox" checked={!!filters[k]} onChange={() => toggleFilter(k)} />
                      <span style={{ minWidth: 80, marginLeft: 8 }}>{k}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: 18 }}>
                  <button className="btn" onClick={saveDisplay} style={{ background: '#FFD400', color: '#111' }}>Save display settings</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

