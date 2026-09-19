// This component checks if the user is signed in and has the correct role
// If not, it redirects them to the appropriate dashboard or sign-in page
// import { useUser } from '@clerk/clerk-react';
// import { Navigate } from 'react-router-dom';

// export default function ProtectedRoute({ children, allowedRole }) {
//   const { isSignedIn, user } = useUser();
//   const role = user?.publicMetadata?.role;

//   if (!isSignedIn) return <Navigate to="/dashboard" />;
//   if (allowedRole && role !== allowedRole)
//     return <Navigate to={`/${role}/dashboard`} />; // redirect to correct dashboard

//   return children;
// }


import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { ADMIN_EMAILS } from '../adminList'; 

export default function ProtectedRoute({ children, allowedRole, requireAdmin = false }) {
  const { isSignedIn, user } = useUser();
  const role = user?.publicMetadata?.role;

  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(email);

  if (!isSignedIn) return <Navigate to="/dashboard" />;
  if (allowedRole && role !== allowedRole && !(isAdmin && allowedRole === 'teacher')) {
    return <Navigate to={role ? `/${role}/dashboard` : '/role-pending'} />;
  }
  if (requireAdmin && !isAdmin) return <Navigate to="/teacher/dashboard" />;

  return children;
}
