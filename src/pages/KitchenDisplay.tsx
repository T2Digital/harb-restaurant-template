import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import { CheckCircle, Clock, Utensils, ChefHat } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'preparing'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching kitchen orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsReady = async (order: Order) => {
    if (!order.id) return;
    
    try {
      const orderRef = doc(db, 'orders', order.id);
      // If delivery, it goes to out_for_delivery. Otherwise, it's delivered (completed).
      const newStatus = order.orderType === 'delivery' ? 'out_for_delivery' : 'delivered';
      
      await updateDoc(orderRef, {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      alert('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ChefHat className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">شاشة المطبخ (KDS)</h1>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-700">
            <Utensils className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-400">لا توجد طلبات قيد التحضير حالياً</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                <div className="bg-gray-700 p-4 border-b border-gray-600 flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-400 block">رقم الطلب</span>
                    <span className="text-xl font-bold text-primary">#{order.orderNumber || order.id?.slice(-4)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-400 block">نوع الطلب</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      order.orderType === 'dine_in' ? 'bg-blue-500/20 text-blue-400' :
                      order.orderType === 'takeaway' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {order.orderType === 'dine_in' ? 'صالة' : order.orderType === 'takeaway' ? 'تيك أواي' : 'توصيل'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4 flex-grow">
                  {order.orderType === 'dine_in' && order.tableNumber && (
                    <div className="mb-4 bg-gray-900 p-2 rounded text-center border border-gray-700">
                      <span className="text-gray-400 text-sm">رقم الطاولة: </span>
                      <span className="font-bold text-lg">{order.tableNumber}</span>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-start border-b border-gray-700/50 pb-2 last:border-0">
                        <div>
                          <p className="font-bold text-lg">{item.name}</p>
                          {item.size && <p className="text-sm text-gray-400">الحجم: {item.size}</p>}
                          {item.notes && <p className="text-sm text-yellow-400 mt-1">ملاحظة: {item.notes}</p>}
                        </div>
                        <div className="bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
                          <span className="font-bold text-xl text-primary">x{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-gray-800 border-t border-gray-700 mt-auto">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>
                      {order.createdAt ? format(order.createdAt.toDate(), 'hh:mm a', { locale: ar }) : 'الآن'}
                    </span>
                  </div>
                  <button
                    onClick={() => markAsReady(order)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>جاهز</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
