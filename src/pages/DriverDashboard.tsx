import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import { MapPin, CheckCircle, Navigation, Phone, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function DriverDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch orders that are out for delivery
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'out_for_delivery'),
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
      console.error("Error fetching driver orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsDelivered = async (orderId: string) => {
    if (!orderId) return;
    
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'delivered'
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      alert('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  const openGoogleMaps = (address: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
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
          <Truck className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">شاشة الطيارين (التوصيل)</h1>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-700">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-400">لا توجد طلبات قيد التوصيل حالياً</h2>
            <p className="text-gray-500 mt-2">كل الطلبات تم توصيلها بنجاح!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                <div className="bg-gray-700 p-4 border-b border-gray-600 flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-400 block">رقم الطلب</span>
                    <span className="text-xl font-bold text-primary">#{order.orderNumber || order.id?.slice(-4)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-400 block">الإجمالي</span>
                    <span className="text-lg font-bold text-green-400">{order.totalAmount} ج.م</span>
                  </div>
                </div>
                
                <div className="p-5 flex-grow space-y-4">
                  <div>
                    <h3 className="text-gray-400 text-sm mb-1">بيانات العميل</h3>
                    <p className="font-bold text-lg">{order.customerName}</p>
                    <div className="flex items-center gap-2 text-gray-300 mt-1">
                      <Phone className="w-4 h-4 text-primary" />
                      <a href={`tel:${order.customerPhone}`} className="hover:text-primary transition-colors">
                        {order.customerPhone}
                      </a>
                    </div>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm text-gray-400 mb-1">العنوان</h4>
                        <p className="text-sm leading-relaxed">{order.location?.address || 'لم يتم تحديد عنوان'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {order.notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                      <p className="text-sm text-yellow-400"><span className="font-bold">ملاحظة:</span> {order.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-gray-800 border-t border-gray-700 mt-auto grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openGoogleMaps(order.location?.address || '')}
                    disabled={!order.location?.address}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Navigation className="w-5 h-5" />
                    <span>الخريطة</span>
                  </button>
                  <button
                    onClick={() => markAsDelivered(order.id!)}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>تم التوصيل</span>
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
