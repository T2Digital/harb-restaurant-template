import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { CartProvider } from './CartContext';
import Layout from './components/Layout';

const Home = React.lazy(() => import('./pages/Home'));
const Menu = React.lazy(() => import('./pages/Menu'));
const Cart = React.lazy(() => import('./pages/Cart'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const MyOrders = React.lazy(() => import('./pages/MyOrders'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AIWaiter = React.lazy(() => import('./pages/AIWaiter'));
const Login = React.lazy(() => import('./pages/Login'));
const KitchenDisplay = React.lazy(() => import('./pages/KitchenDisplay'));
const DriverDashboard = React.lazy(() => import('./pages/DriverDashboard'));

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-yellow-500">جاري التحميل...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-yellow-500">جاري التحميل...</div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="menu" element={<Menu />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="my-orders" element={<MyOrders />} />
                <Route path="ai-waiter" element={<AIWaiter />} />
                <Route path="login" element={<Login />} />
                <Route path="kitchen" element={<ProtectedRoute roles={['admin', 'employee']}><KitchenDisplay /></ProtectedRoute>} />
                <Route path="driver" element={<ProtectedRoute roles={['admin', 'employee', 'driver']}><DriverDashboard /></ProtectedRoute>} />
                <Route path="admin" element={<ProtectedRoute roles={['admin', 'employee']}><AdminDashboard /></ProtectedRoute>} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
