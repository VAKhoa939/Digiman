import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { fetchUserLoading, isAuthenticated } = useAuth();
  if (fetchUserLoading) return <div className="text-center py-4">Loading…</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
