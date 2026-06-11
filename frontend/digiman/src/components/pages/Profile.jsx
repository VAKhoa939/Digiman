
import { useAuth } from '../../context/AuthContext';
// no extra hooks/imports needed for this simplified profile

// Simple Profile page showing avatar, plain header background, display name,
// username, id and role. Uses `useAuth()` to read user data fetched by the
// `AuthProvider` (which calls `fetchUser()` on mount).
export default function Profile() {
  const { user, fetchUserLoading, subscription } = useAuth();

  const avatarLetter = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.username ? user.username.charAt(0).toUpperCase() : 'U');

  const avatarStyle = {
    width: 96,
    height: 96,
    minWidth: 96,
    minHeight: 96,
    borderRadius: 8,
    background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
    display: 'grid',
    placeItems: 'center',
    fontSize: 36,
    color: '#111',
    border: '4px solid var(--card-bg)',
    boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
  };

  const details = [
    { label: 'Email', value: user?.email || 'Not available' },
    { label: 'Member since', value: user?.createdAt || 'Unknown' },
    { label: 'Subscription', value: subscription?.planName || 'Free / no plan' },
  ];

  return (
    <div className="profile-page">
      <div className="profile-header"></div>
      <div className="profile-content" style={{ padding: '0 20px' }}>
        {fetchUserLoading ? (
          <div style={{ padding: 24 }}>Loading profile…</div>
        ) : (
          <>
            <div className="profile-row" style={{ marginTop: -48, display: 'flex', alignItems: 'center', gap: 16 }}>
              {user.avatar ? (
                <img src={user.avatar} className="me-3" style={{width:96, height:96, minWidth:96, minHeight:96, objectFit:'cover', borderRadius:8}} />
              ) : (
                <div style={avatarStyle} aria-hidden>{avatarLetter}</div>

              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{user.displayName || user.username}</div>
                <div style={{ color: 'var(--app-muted)' }}>@{user.username}</div>
              </div>

              <div style={{ marginLeft: 'auto', textAlign: 'right', color: 'var(--app-muted)' }}>
                <div style={{ fontSize: 14 }}>ID: <strong style={{ color: 'var(--app-fg)' }}>{user.id}</strong></div>
                <div style={{ fontSize: 14, marginTop: 6 }}>Role: <strong style={{ color: 'var(--app-fg)' }}>{user.role}</strong></div>
              </div>
            </div>

            <div className="profile-details-card" style={{ marginTop: 18 }}>
              {details.map((item) => (
                <div key={item.label} className="d-flex justify-content-between py-2 border-bottom">
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}