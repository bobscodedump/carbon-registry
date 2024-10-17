import React from 'react';
import { useLocation, Outlet, Navigate } from 'react-router-dom';
import { useUserContext } from 'carbon-library_ci';

const PrivateRoute = () => {
  const { IsAuthenticated } = useUserContext();
  const location = useLocation();
  return IsAuthenticated() ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default PrivateRoute;
