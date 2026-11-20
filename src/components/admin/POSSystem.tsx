import React, { useState, useMemo, useRef } from 'react';
import { Category, MenuItem, CartItem, Order } from '../../types';
import { Plus, Minus, Trash2, Printer, CheckCircle, Search, UtensilsCrossed, ShoppingBag, Truck } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, runTransaction, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';

interface POSSystemProps {
  categories: Category[];
  menuItems: MenuItem[];
}

export default function POSSystem({ categories, menuItems }: POSSystemProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<'takeaway' | 'dine_in' | 'delivery'>('takeaway');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (item: MenuItem, size?: { name: string; price: number }) => {
    setCart(prev => {
      const existingItem = prev.find(i => 
        i.menuItemId === item.id && i.size === size?.name
      );

      if (existingItem) {
        return prev.map(i => 
          i === existingItem 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: size ? size.price : item.price,
        quantity: 1,
        size: size?.name
      }];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[index];
      const newQuantity = item.quantity + delta;
      
      if (newQuantity <= 0) {
        newCart.splice(index, 1);
      } else {
        item.quantity = newQuantity;
      }
      
      return newCart;
    });
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value;
    setCustomerPhone(newPhone);

    if (newPhone.length >= 10) {
      try {
        const customerDoc = await getDoc(doc(db, 'customers', newPhone));
        if (customerDoc.exists()) {
          const data = customerDoc.data();
          if (data.name && !customerName) setCustomerName(data.name);
          if (data.addresses && data.addresses.length > 0 && !customerAddress) {
            setCustomerAddress(data.addresses[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
      }
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      // Use transaction to get sequential order number starting from 101
      const counterRef = doc(db, 'settings', 'orderCounter');
      
      let newOrderNumber = 101;
      try {
        newOrderNumber = await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          let nextOrderNumber = 101;
          
          if (counterDoc.exists() && counterDoc.data().lastOrderNumber) {
            nextOrderNumber = counterDoc.data().lastOrderNumber + 1;
          }
          
          transaction.set(counterRef, { lastOrderNumber: nextOrderNumber }, { merge: true });
          return nextOrderNumber;
        });
      } catch (e) {
        console.error("Failed to get sequential order number, using fallback", e);
        // Fallback to timestamp-based number if transaction fails (e.g., offline)
        newOrderNumber = Math.floor(Date.now() / 1000) % 10000;
      }

      const orderData = {
        customerName: customerName || 'عميل كاشير',
        customerPhone: customerPhone || '',
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size || null,
          notes: item.notes || null
        })),
        totalAmount,
        status: 'preparing',
        paymentMethod: 'cash',
        paymentStatus: orderType === 'takeaway' ? 'paid' : 'pending',
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : '',
        location: { address: customerAddress || '', lat: 0, lng: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cashierId: 'admin', // Or current user ID
        orderNumber: newOrderNumber,
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Update Customer CRM Data if phone is provided
      if (customerPhone.length >= 10) {
        const customerRef = doc(db, 'customers', customerPhone);
        try {
          const customerDoc = await getDoc(customerRef);
          if (customerDoc.exists()) {
            const updates: any = {
              name: customerName || customerDoc.data().name,
              lastOrderAt: serverTimestamp(),
              totalOrders: (customerDoc.data().totalOrders || 0) + 1
            };
            if (customerAddress && customerAddress.trim() !== '') {
              updates.addresses = arrayUnion(customerAddress);
            }
            await updateDoc(customerRef, updates);
          } else {
            await setDoc(customerRef, {
              phone: customerPhone,
              name: customerName || 'عميل كاشير',
              addresses: customerAddress ? [customerAddress] : [],
              createdAt: serverTimestamp(),
              lastOrderAt: serverTimestamp(),
              totalOrders: 1
            });
          }
        } catch (e) {
          console.error("Error updating customer CRM:", e);
        }
      }
      
      const newOrder = { ...orderData, id: docRef.id } as Order;
      setLastOrder(newOrder);
      
      // Print receipts
      printCashierReceipts(newOrder);
      setTimeout(() => {
        printKitchenReceipt(newOrder);
      }, 1500); // Delay to allow the first print dialog to open

      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setTableNumber('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      console.error('Error creating POS order:', error);
      alert('حدث خطأ أثناء إنشاء الطلب');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipts = (order: Order) => {
    printCashierReceipts(order);
    setTimeout(() => {
      printKitchenReceipt(order);
    }, 1500);
  };

  const printCashierReceipts = (order: Order) => {
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const printContent = `
      <html>
        <head>
          <title>طباعة إيصالات الكاشير - ${order.id.slice(-6)}</title>
          <style>
            body { font-family: 'Tajawal', sans-serif; margin: 0; padding: 20px; direction: rtl; }
            .receipt { width: 300px; margin: 0 auto 40px auto; border: 1px dashed #ccc; padding: 15px; page-break-after: always; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .title { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; }
            .subtitle { font-size: 14px; color: #666; margin: 0; }
            .info { margin-bottom: 15px; font-size: 14px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px; }
            .items th { text-align: right; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .items td { padding: 5px 0; }
            .items .qty { width: 30px; text-align: center; }
            .items .price { text-align: left; }
            .total { border-top: 1px solid #eee; padding-top: 10px; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            @media print {
              body { padding: 0; }
              .receipt { border: none; margin: 0; padding: 0; width: 100%; }
            }
          </style>
        </head>
        <body>
          <!-- Customer Receipt -->
          <div class="receipt">
            <div class="header">
              <h1 class="title">مطعم حرب</h1>
              <p class="subtitle">إيصال العميل</p>
            </div>
            <div class="info">
              <div class="info-row"><span>رقم الطلب:</span> <span>#${order.orderNumber || order.id.slice(-6).toUpperCase()}</span></div>
              <div class="info-row"><span>النوع:</span> <span>${order.orderType === 'dine_in' ? 'صالة' : order.orderType === 'takeaway' ? 'تيك أواي' : 'توصيل'}</span></div>
              ${order.orderType === 'dine_in' && order.tableNumber ? `<div class="info-row"><span>رقم الطاولة:</span> <span>${order.tableNumber}</span></div>` : ''}
              ${order.location?.address ? `<div class="info-row"><span>العنوان:</span> <span>${order.location.address}</span></div>` : ''}
              <div class="info-row"><span>التاريخ:</span> <span>${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG')}</span></div>
              <div class="info-row"><span>حالة الدفع:</span> <span>${order.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span></div>
            </div>
            <table class="items">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th class="qty">الكمية</th>
                  <th class="price">السعر</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.name} ${item.size ? `(${item.size})` : ''}</td>
                    <td class="qty">${item.quantity}</td>
                    <td class="price">${item.price * item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              <span>الإجمالي:</span>
              <span>${order.totalAmount} ج.م</span>
            </div>
            <div class="footer">
              شكراً لزيارتكم مطعم حرب!<br>
              نتمنى لكم وجبة شهية
            </div>
          </div>

          <!-- Cashier Receipt -->
          <div class="receipt">
            <div class="header">
              <h1 class="title">مطعم حرب</h1>
              <p class="subtitle">نسخة الكاشير</p>
            </div>
            <div class="info">
              <div class="info-row"><span>رقم الطلب:</span> <span>#${order.orderNumber || order.id.slice(-6).toUpperCase()}</span></div>
              <div class="info-row"><span>النوع:</span> <span>${order.orderType === 'dine_in' ? 'صالة' : order.orderType === 'takeaway' ? 'تيك أواي' : 'توصيل'}</span></div>
              ${order.orderType === 'dine_in' && order.tableNumber ? `<div class="info-row"><span>رقم الطاولة:</span> <span>${order.tableNumber}</span></div>` : ''}
              ${order.location?.address ? `<div class="info-row"><span>العنوان:</span> <span>${order.location.address}</span></div>` : ''}
              <div class="info-row"><span>التاريخ:</span> <span>${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG')}</span></div>
              <div class="info-row"><span>حالة الدفع:</span> <span>${order.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span></div>
            </div>
            <table class="items">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th class="qty">الكمية</th>
                  <th class="price">السعر</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.name} ${item.size ? `(${item.size})` : ''}</td>
                    <td class="qty">${item.quantity}</td>
                    <td class="price">${item.price * item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              <span>الإجمالي:</span>
              <span>${order.totalAmount} ج.م</span>
            </div>
          </div>
        </body>
      </html>
    `;

    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(printContent);
    iframe.contentWindow?.document.close();

    // Wait for content to load then print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const printKitchenReceipt = (order: Order) => {
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const printContent = `
      <html>
        <head>
          <title>طباعة إيصال المطبخ - ${order.id.slice(-6)}</title>
          <style>
            body { font-family: 'Tajawal', sans-serif; margin: 0; padding: 20px; direction: rtl; }
            .receipt { width: 300px; margin: 0 auto; border: 1px dashed #ccc; padding: 15px; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .title { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; }
            .subtitle { font-size: 14px; color: #666; margin: 0; }
            .info { margin-bottom: 15px; font-size: 14px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px; }
            .items th { text-align: right; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .items td { padding: 5px 0; }
            .items .qty { width: 30px; text-align: center; }
            @media print {
              body { padding: 0; }
              .receipt { border: none; margin: 0; padding: 0; width: 100%; }
            }
          </style>
        </head>
        <body>
          <!-- Kitchen Receipt -->
          <div class="receipt">
            <div class="header">
              <h1 class="title">مطعم حرب - المطبخ</h1>
              <p class="subtitle">نسخة التحضير</p>
            </div>
            <div class="info">
              <div class="info-row"><span>رقم الطلب:</span> <span>#${order.orderNumber || order.id.slice(-6).toUpperCase()}</span></div>
              <div class="info-row"><span>النوع:</span> <span>${order.orderType === 'dine_in' ? 'صالة' : order.orderType === 'takeaway' ? 'تيك أواي' : 'توصيل'}</span></div>
              ${order.orderType === 'dine_in' && order.tableNumber ? `<div class="info-row"><span>رقم الطاولة:</span> <span>${order.tableNumber}</span></div>` : ''}
              ${order.location?.address ? `<div class="info-row"><span>العنوان:</span> <span>${order.location.address}</span></div>` : ''}
              <div class="info-row"><span>الوقت:</span> <span>${new Date().toLocaleTimeString('ar-EG')}</span></div>
            </div>
            <table class="items">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th class="qty">الكمية</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>
                      <strong>${item.name}</strong>
                      ${item.size ? `<br><small>الحجم: ${item.size}</small>` : ''}
                      ${item.notes ? `<br><small>ملاحظات: ${item.notes}</small>` : ''}
                    </td>
                    <td class="qty" style="font-size: 18px; font-weight: bold;">${item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(printContent);
    iframe.contentWindow?.document.close();

    // Wait for content to load then print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Left Panel - Menu Items */}
      <div className="flex-1 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {/* Search and Categories */}
        <div className="p-4 border-b border-white/5 bg-black/20">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="ابحث عن صنف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-10 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === 'all' 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              الكل
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.id 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-colors cursor-pointer flex flex-col"
                onClick={() => {
                  if (item.sizes && item.sizes.length > 0) {
                    // If has sizes, add the first size by default or show a modal (simplified here to add first size)
                    addToCart(item, item.sizes[0]);
                  } else {
                    addToCart(item);
                  }
                }}
              >
                {item.imageUrl && (
                  <div className="w-full h-24 rounded-lg overflow-hidden mb-2">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">{item.name}</h3>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-emerald-400 font-bold text-sm">
                    {item.sizes && item.sizes.length > 0 ? item.sizes[0].price : item.price} ج.م
                  </span>
                  <button className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-96 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {/* Order Type Selection */}
        <div className="p-4 border-b border-white/5 bg-black/20">
          <div className="flex bg-black/50 rounded-lg p-1 mb-4">
            <button
              onClick={() => setOrderType('takeaway')}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-colors ${
                orderType === 'takeaway' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag size={18} /> تيك أواي
            </button>
            <button
              onClick={() => setOrderType('dine_in')}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-colors ${
                orderType === 'dine_in' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UtensilsCrossed size={18} /> صالة
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-colors ${
                orderType === 'delivery' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck size={18} /> دليفري
            </button>
          </div>

          {orderType === 'dine_in' && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="رقم الطاولة (اختياري)"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="الهاتف (اختياري)"
              value={customerPhone}
              onChange={handlePhoneChange}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="اسم العميل (اختياري)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="mb-2">
            <input
              type="text"
              placeholder="العنوان (اختياري)"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p>السلة فارغة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div key={`${item.menuItemId}-${item.size}-${index}`} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-white text-sm font-medium">{item.name}</h4>
                      {item.size && <span className="text-xs text-slate-400">{item.size}</span>}
                    </div>
                    <button 
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold text-sm">{item.price * item.quantity} ج.م</span>
                    <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1">
                      <button 
                        onClick={() => updateQuantity(index, 1)}
                        className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                      >
                        <Plus size={14} />
                      </button>
                      <span className="text-white font-medium w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(index, -1)}
                        className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-300">الإجمالي</span>
            <span className="text-2xl font-bold text-emerald-400">{totalAmount} ج.م</span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : showSuccess ? (
              <>
                <CheckCircle size={20} /> تم تأكيد الطلب
              </>
            ) : (
              <>
                <Printer size={20} /> تأكيد وطباعة
              </>
            )}
          </button>

          {lastOrder && !isProcessing && !showSuccess && (
            <button
              onClick={() => printReceipts(lastOrder)}
              className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Printer size={16} /> إعادة طباعة آخر إيصال
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
