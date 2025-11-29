import React from 'react';
import { useAuth } from '../../context/AuthContext';

// Simple Profile page showing avatar, plain header background, display name,
// username, id and role. Uses `useAuth()` to read user data fetched by the
// `AuthProvider` (which calls `fetchUser()` on mount).
export default function Profile() {
  const { user, fetchUserLoading } = useAuth();

  const u = user || {
    id: '—',
    username: 'anonymous',
    display_name: 'Anonymous User',
    role: 'reader',
  };

  const avatarLetter = u.display_name ? u.display_name.charAt(0).toUpperCase() : (u.username ? u.username.charAt(0).toUpperCase() : 'U');

  const avatar = {
    width: 96,
    height: 96,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
    display: 'grid',
    placeItems: 'center',
    fontSize: 36,
    color: '#111',
    border: '4px solid var(--card-bg)',
    boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
  };

  return (
    <div className="profile-page">
      <div className="profile-header"></div>

      <div className="profile-content" style={{ padding: '0 8px' }}>
        {fetchUserLoading ? (
          <div style={{ padding: 24 }}>Loading profile…</div>
        ) : (
          <>
            <div className="profile-row" style={{ marginTop: -36, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={avatar} aria-hidden>{avatarLetter}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{u.display_name || u.username}</div>
                <div style={{ color: 'var(--app-muted)' }}>@{u.username}</div>
              </div>

              <div style={{ marginLeft: 'auto', textAlign: 'right', color: 'var(--app-muted)' }}>
                <div style={{ fontSize: 14 }}>ID: <strong style={{ color: 'var(--app-fg)' }}>{u.id}</strong></div>
                <div style={{ fontSize: 14, marginTop: 6 }}>Role: <strong style={{ color: 'var(--app-fg)' }}>{u.role}</strong></div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h4>About</h4>
              <p style={{ color: 'var(--app-primary)' }}>This profile shows data returned from the Auth context which is populated by the backend. Edit fields or upload avatar can be added later.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
