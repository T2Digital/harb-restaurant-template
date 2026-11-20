import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { Home, Menu as MenuIcon, Receipt, User, LogOut, Bot, LayoutDashboard, Rocket, MapPin, Phone, Instagram, Facebook, Twitter, Download, Bell, History, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { RESTAURANT_PHONE, RESTAURANT_ADDRESS } from '../constants';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export default function Layout() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const { isInstallable, promptInstall } = usePWAInstall();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const isAiWaiter = location.pathname === '/ai-waiter';

  useEffect(() => {
    // Check local storage for theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'employee') {
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(setNotificationPermission);
        }
      }

      const q = query(
        collection(db, 'orders'),
        where('status', '==', 'pending')
      );

      let initialLoad = true;

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingOrdersCount(snapshot.docs.length);
        
        if (initialLoad) {
          initialLoad = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const order = change.doc.data();
            
            // Play sound
            const audio = new Audio('/notification.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));

            // Show browser notification
            if (Notification.permission === 'granted') {
              new Notification('طلب جديد! 🚀', {
                body: `طلب جديد من ${order.customerName} بقيمة ${order.totalAmount} ج.م`,
                icon: '/icon-192x192.png'
              });
            }
          }
        });
      }, (error) => {
        console.error("Error listening to pending orders:", error);
      });

      return () => unsubscribe();
    }
  }, [user]);

  return (
    <div className="min-h-screen text-slate-300 font-sans flex flex-col" dir="rtl">
      <header className="glass-panel sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Rocket className="text-yellow-500" size={28} />
            <span className="text-2xl font-bold neon-text">مطعم حرب</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`flex items-center gap-1 transition-colors ${location.pathname === '/' ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`}>
              <Home size={20} /> الرئيسية
            </Link>
            <Link to="/menu" className={`flex items-center gap-1 transition-colors ${location.pathname === '/menu' ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`}>
              <MenuIcon size={20} /> المنيو
            </Link>
            <Link to="/my-orders" className={`flex items-center gap-1 transition-colors ${location.pathname === '/my-orders' ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`}>
              <History size={20} /> طلباتي
            </Link>
            <Link to="/ai-waiter" className={`flex items-center gap-1 transition-colors ${location.pathname === '/ai-waiter' ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`}>
              <Bot size={20} /> جارسون الذكاء الاصطناعي
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-400 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {(user?.role === 'admin' || user?.role === 'employee') && notificationPermission !== 'granted' && (
              <button
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission().then(setNotificationPermission);
                  }
                }}
                className="p-2 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                title="تفعيل الإشعارات"
              >
                <Bell size={20} className="animate-pulse" />
              </button>
            )}
            {isInstallable && (
              <button
                onClick={promptInstall}
                className="hidden sm:flex items-center gap-1 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border border-yellow-500/30"
              >
                <Download size={16} /> تثبيت التطبيق
              </button>
            )}
            <Link to="/cart" className="relative p-2 text-slate-400 hover:text-yellow-500 transition-colors">
              <Receipt size={24} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.8)]">
                  {cartCount}
                </span>
              )}
            </Link>
            
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === 'admin' || user.role === 'employee' ? (
                  <Link to="/admin" className="hidden sm:flex items-center gap-2 hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-yellow-500/50" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
                        <LayoutDashboard size={18} className="text-yellow-500" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-yellow-100">{user?.displayName}</span>
                  </Link>
                ) : (
                  <div className="hidden sm:flex items-center gap-2">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-yellow-500/50" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
                        <User size={18} className="text-yellow-500" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-yellow-100">{user?.displayName}</span>
                  </div>
                )}
                <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="تسجيل الخروج">
                  <LogOut size={20} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-grow relative z-10">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Professional Footer */}
      {!isAiWaiter && location.pathname !== '/checkout' && (
        <footer className="bg-black border-t border-yellow-500/20 pt-16 pb-8 mt-20 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-1">
                <Link to="/" className="flex items-center gap-2 mb-6">
                  <Rocket className="text-yellow-500" size={32} />
                  <span className="text-3xl font-bold neon-text">مطعم حرب</span>
                </Link>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  نقدم لكم أشهى المأكولات والمشاوي والسندوتشات بأعلى جودة وأفضل طعم. تجربة طعام لا تُنسى في كل قضمة.
                </p>
                <div className="flex items-center gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors">
                    <Facebook size={20} />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors">
                    <Instagram size={20} />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors">
                    <Twitter size={20} />
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  روابط سريعة
                </h3>
                <ul className="space-y-3">
                  <li><Link to="/" className="text-slate-400 hover:text-yellow-500 transition-colors">الرئيسية</Link></li>
                  <li><Link to="/menu" className="text-slate-400 hover:text-yellow-500 transition-colors">المنيو</Link></li>
                  <li><Link to="/my-orders" className="text-slate-400 hover:text-yellow-500 transition-colors">طلباتي</Link></li>
                  <li><Link to="/ai-waiter" className="text-slate-400 hover:text-yellow-500 transition-colors">الجارسون الذكي</Link></li>
                  <li><Link to="/cart" className="text-slate-400 hover:text-yellow-500 transition-colors">الريسيت</Link></li>
                  {!user && (
                    <li><Link to="/login" className="text-slate-400 hover:text-yellow-500 transition-colors">تسجيل الدخول (للإدارة)</Link></li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  أقسام المنيو
                </h3>
                <ul className="space-y-3">
                  <li><Link to="/menu" className="text-slate-400 hover:text-yellow-500 transition-colors">المشاوي</Link></li>
                  <li><Link to="/menu" className="text-slate-400 hover:text-yellow-500 transition-colors">الشاورما</Link></li>
                  <li><Link to="/menu" className="text-slate-400 hover:text-yellow-500 transition-colors">البرجر</Link></li>
                  <li><Link to="/menu" className="text-slate-400 hover:text-yellow-500 transition-colors">مدفع حرب</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  تواصل معنا
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-slate-400">
                    <MapPin className="text-yellow-500 mt-1 flex-shrink-0" size={20} />
                    <span>{RESTAURANT_ADDRESS}</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-400">
                    <Phone className="text-yellow-500 mt-1 flex-shrink-0" size={20} />
                    <span dir="ltr">{RESTAURANT_PHONE}</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-slate-500 text-sm">
                © {new Date().getFullYear()} مطعم حرب. جميع الحقوق محفوظة.
              </p>
              <div className="flex gap-4 text-sm text-slate-500">
                <a href="#" className="hover:text-yellow-500 transition-colors">سياسة الخصوصية</a>
                <a href="#" className="hover:text-yellow-500 transition-colors">الشروط والأحكام</a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass-panel z-50 border-t border-white/10">
        <div className="flex justify-around items-center h-16">
          <Link to="/" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location.pathname === '/' ? 'text-yellow-500' : 'text-slate-500'}`}>
            <Home size={20} />
            <span className="text-[10px] mt-1">الرئيسية</span>
          </Link>
          <Link to="/menu" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location.pathname === '/menu' ? 'text-yellow-500' : 'text-slate-500'}`}>
            <MenuIcon size={20} />
            <span className="text-[10px] mt-1">المنيو</span>
          </Link>
          <Link to="/my-orders" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location.pathname === '/my-orders' ? 'text-yellow-500' : 'text-slate-500'}`}>
            <History size={20} />
            <span className="text-[10px] mt-1">طلباتي</span>
          </Link>
          <Link to="/ai-waiter" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location.pathname === '/ai-waiter' ? 'text-yellow-500' : 'text-slate-500'}`}>
            <Bot size={20} />
            <span className="text-[10px] mt-1">الجارسون</span>
          </Link>
          {isInstallable && (
            <button onClick={promptInstall} className="flex flex-col items-center justify-center w-full h-full transition-colors text-yellow-500">
              <Download size={20} />
              <span className="text-[10px] mt-1">تثبيت</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin FAB */}
      {(user?.role === 'admin' || user?.role === 'employee') && (
        <Link 
          to="/admin" 
          className="fixed bottom-20 md:bottom-8 left-4 md:left-8 z-50 bg-yellow-500 text-black w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20 hover:scale-110 transition-transform"
        >
          <LayoutDashboard size={24} />
          {pendingOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[10px] font-bold items-center justify-center">
                {pendingOrdersCount > 9 ? '9+' : pendingOrdersCount}
              </span>
            </span>
          )}
        </Link>
      )}
    </div>
  );
}
