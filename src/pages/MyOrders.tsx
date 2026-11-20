import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { PAYMENT_METHODS } from '../constants';
import { Phone, History, ArrowRight, ShoppingBag, Clock, MapPin, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function MyOrders() {
  useDocumentTitle('مطعم حرب | طلباتي');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // If user is logged in, fetch their orders automatically
  useEffect(() => {
    if (user?.uid) {
      fetchOrdersByUserId(user.uid);
    }
  }, [user]);

  const fetchOrdersByUserId = (userId: string) => {
    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      // Sort locally to avoid requiring a composite index
      fetchedOrders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setOrders(fetchedOrders);
      setLoading(false);
      setSearched(true);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return unsubscribe;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      alert('يرجى إدخال رقم هاتف صحيح');
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerPhone', '==', phone)
      );

      const snapshot = await getDocs(q);
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Sort locally to avoid requiring a composite index
      fetchedOrders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setOrders(fetchedOrders);
      setSearched(true);
    } catch (error) {
      console.error("Error fetching orders:", error);
      alert('حدث خطأ أثناء البحث عن الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (order: any) => {
    if (!order.items || order.items.length === 0) return;
    
    // Add all items from the past order to the cart
    order.items.forEach((item: any) => {
      addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        notes: item.notes
      });
    });
    
    // Navigate to cart
    navigate('/cart');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد المراجعة';
      case 'preparing': return 'جاري التحضير';
      case 'out_for_delivery': return 'في الطريق إليك';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'preparing': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'out_for_delivery': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'delivered': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'cancelled': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-300"
        >
          <ArrowRight size={24} />
        </button>
        <h1 className="text-4xl font-bold text-white neon-text flex items-center gap-3">
          <History className="text-yellow-500" size={36} />
          طلباتي السابقة
        </h1>
      </div>

      {!user && !searched && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center mb-8">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="text-yellow-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">ابحث عن طلباتك برقم الموبايل</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            أدخل رقم الموبايل الذي استخدمته في طلباتك السابقة لعرض تاريخ طلباتك وإعادة الطلب بسهولة.
          </p>
          
          <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-3">
            <div className="relative flex-1">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500" size={20} />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors text-left"
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري البحث...' : 'بحث'}
            </button>
          </form>
        </div>
      )}

      {searched && (
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="text-center py-12 glass-panel rounded-2xl border border-white/5">
              <ShoppingBag className="mx-auto text-slate-500 mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">لا توجد طلبات سابقة</h3>
              <p className="text-slate-400 mb-6">لم نتمكن من العثور على أي طلبات مرتبطة بهذا الرقم.</p>
              <button
                onClick={() => navigate('/menu')}
                className="bg-yellow-500 text-black px-6 py-2 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
              >
                تصفح المنيو
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div 
                  className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black/50 rounded-xl flex items-center justify-center border border-white/10">
                      <ShoppingBag className="text-yellow-500" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-white text-lg">طلب #{order.orderNumber || order.id.slice(-4)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'dd MMM yyyy, hh:mm a', { locale: ar }) : 'تاريخ غير معروف'}
                        </span>
                        <span className="font-bold text-yellow-500" dir="ltr">{order.totalAmount} ج.م</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(order);
                      }}
                      className="flex items-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 px-4 py-2 rounded-xl transition-colors border border-yellow-500/30"
                    >
                      <RefreshCw size={16} />
                      <span className="font-medium">إعادة الطلب</span>
                    </button>
                    <div className="p-2 text-slate-400">
                      {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-black/30"
                    >
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                            <ShoppingBag size={16} className="text-yellow-500" />
                            تفاصيل الطلب
                          </h4>
                          <ul className="space-y-3">
                            {order.items?.map((item: any, idx: number) => (
                              <li key={idx} className="flex justify-between items-start text-sm">
                                <div>
                                  <span className="text-slate-300">{item.quantity}x {item.name}</span>
                                  {item.size && <span className="text-slate-500 text-xs mr-2">({item.size})</span>}
                                  {item.notes && <p className="text-slate-500 text-xs mt-1">ملاحظات: {item.notes}</p>}
                                </div>
                                <span className="text-white font-medium" dir="ltr">{item.price * item.quantity} ج.م</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                            <MapPin size={16} className="text-yellow-500" />
                            معلومات التوصيل
                          </h4>
                          <div className="bg-black/50 p-4 rounded-xl border border-white/5 space-y-2 text-sm">
                            <p className="text-slate-300"><span className="text-slate-500 w-16 inline-block">الاسم:</span> {order.customerName}</p>
                            <p className="text-slate-300"><span className="text-slate-500 w-16 inline-block">الموبايل:</span> <span dir="ltr">{order.customerPhone}</span></p>
                            <p className="text-slate-300"><span className="text-slate-500 w-16 inline-block">العنوان:</span> {order.location?.address || 'غير محدد'}</p>
                            <p className="text-slate-300"><span className="text-slate-500 w-16 inline-block">الدفع:</span> {PAYMENT_METHODS.find(p => p.id === order.paymentMethod)?.name || order.paymentMethod}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
