import React, { useState, useEffect } from 'react';
import { db, secondaryAuth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CheckCircle, Clock, Truck, XCircle, MapPin, Phone, User, CreditCard, Package, Plus, Edit2, Trash2, Image as ImageIcon, MessageCircle, ExternalLink, Settings, ArrowUp, ArrowDown, Bell } from 'lucide-react';
import { MENU_CATEGORIES, MENU_ITEMS } from '../constants';
import { Category, MenuItem } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import POSSystem from '../components/admin/POSSystem';
import AccountsReport from '../components/admin/AccountsReport';

export default function AdminDashboard() {
  useDocumentTitle('مطعم حرب | لوحة التحكم');
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'settings' | 'pos' | 'accounts'>('orders');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  // Settings state
  const [paymentNumber, setPaymentNumber] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Orders filter state
  const [ordersFilter, setOrdersFilter] = useState<'today' | 'all'>('today');

  // Today's date for filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredOrders = orders.filter(order => {
    if (ordersFilter === 'all') return true;
    if (!order.createdAt) return false;
    const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    return orderDate >= today;
  });
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [employeeMsg, setEmployeeMsg] = useState({ type: '', text: '' });
  
  // Drivers state
  const [drivers, setDrivers] = useState<{id: string, name: string, phone: string}[]>([]);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  // Product form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    imageUrl: ''
  });

  // Category form state
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({
    name: '',
    imageUrl: '',
  });

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    }, (error) => {
      console.error("Error fetching orders:", error);
    });

    const qMenu = query(collection(db, 'menuItems'));
    const unsubscribeMenu = onSnapshot(qMenu, async (snapshot) => {
      const itemsData: MenuItem[] = [];
      snapshot.forEach((doc) => {
        itemsData.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      
      // Seed menu items if empty
      if (itemsData.length === 0) {
        try {
          for (const item of MENU_ITEMS) {
            await addDoc(collection(db, 'menuItems'), item);
          }
        } catch (error) {
          console.error("Error seeding menu items", error);
        }
      } else {
        setMenuItems(itemsData);
      }
    }, (error) => {
      console.error("Error fetching menu items:", error);
    });

    const qCategories = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribeCategories = onSnapshot(qCategories, async (snapshot) => {
      const catsData: Category[] = [];
      snapshot.forEach((doc) => {
        catsData.push({ id: doc.id, ...doc.data() } as Category);
      });
      
      // Seed categories if empty
      if (catsData.length === 0) {
        try {
          let order = 0;
          for (const cat of MENU_CATEGORIES) {
            await setDoc(doc(db, 'categories', cat.id), { name: cat.name, imageUrl: cat.imageUrl || '', order: order++ });
          }
        } catch (error) {
          console.error("Error seeding categories", error);
        }
      } else {
        setCategories(catsData);
        if (!currentProduct.categoryId) {
          setCurrentProduct(prev => ({ ...prev, categoryId: catsData[0]?.id || '' }));
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setPaymentNumber(docSnap.data().paymentNumber || '');
      }
    });

    const qDrivers = query(collection(db, 'drivers'));
    const unsubscribeDrivers = onSnapshot(qDrivers, (snapshot) => {
      const driversData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as {id: string, name: string, phone: string}[];
      setDrivers(driversData);
    }, (error) => {
      console.error("Error fetching drivers:", error);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
      unsubscribeCategories();
      unsubscribeSettings();
      unsubscribeDrivers();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), { paymentNumber }, { merge: true });
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingEmployee(true);
    setEmployeeMsg({ type: '', text: '' });
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, employeeEmail, employeePassword);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: employeeEmail,
        displayName: employeeName,
        role: 'employee',
        createdAt: serverTimestamp()
      });

      // Sign out the newly created user from the secondary auth instance
      await secondaryAuth.signOut();

      setEmployeeMsg({ type: 'success', text: 'تم إنشاء حساب الموظف بنجاح' });
      setEmployeeEmail('');
      setEmployeePassword('');
      setEmployeeName('');
    } catch (error: any) {
      console.error("Error creating employee:", error);
      setEmployeeMsg({ type: 'error', text: 'حدث خطأ أثناء إنشاء الحساب: ' + error.message });
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const sendWhatsAppMessage = (phone: string, message: string) => {
    // Format phone number for WhatsApp (remove leading 0, add country code if needed)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '2' + formattedPhone; // Assuming Egypt country code +20
    } else if (!formattedPhone.startsWith('20')) {
      formattedPhone = '20' + formattedPhone;
    }
    
    const encodedMessage = encodeURIComponent(message);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile 
      ? `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`
      : `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    
    window.open(url, '_blank');
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
      }
    }
  };

  const updateOrderStatus = async (order: any, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const updatePaymentStatus = async (order: any, newPaymentStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), { paymentStatus: newPaymentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);

  const uploadImageToImgBB = async (file: File): Promise<string | null> => {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) {
      console.error('ImgBB API key is missing. Please set VITE_IMGBB_API_KEY in your environment variables.');
      alert('مفتاح ImgBB مفقود. يرجى التأكد من إضافة VITE_IMGBB_API_KEY في إعدادات Vercel.');
      return null;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        return data.data.url;
      } else {
        console.error('ImgBB upload error:', data);
        alert(`فشل رفع الصورة: ${data.error?.message || 'خطأ غير معروف'}`);
        return null;
      }
    } catch (error) {
      console.error('Error uploading to ImgBB:', error);
      alert('حدث خطأ في الاتصال بخادم رفع الصور. يرجى التحقق من اتصالك بالإنترنت.');
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'category') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }

    try {
      if (type === 'product') setIsUploadingProductImage(true);
      else setIsUploadingCategoryImage(true);

      const downloadURL = await uploadImageToImgBB(file);
      
      if (downloadURL) {
        if (type === 'product') {
          setCurrentProduct(prev => ({ ...prev, imageUrl: downloadURL }));
        } else {
          setCurrentCategory(prev => ({ ...prev, imageUrl: downloadURL }));
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      if (type === 'product') setIsUploadingProductImage(false);
      else setIsUploadingCategoryImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentProduct.id) {
        const productRef = doc(db, 'menuItems', currentProduct.id);
        await updateDoc(productRef, currentProduct);
      } else {
        await addDoc(collection(db, 'menuItems'), currentProduct);
      }
      setIsEditing(false);
      setCurrentProduct({ name: '', description: '', price: 0, categoryId: MENU_CATEGORIES[0].id, imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'menuItems');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      try {
        await deleteDoc(doc(db, 'menuItems', productId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `menuItems/${productId}`);
      }
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingCategory && currentCategory.id) {
        const categoryRef = doc(db, 'categories', currentCategory.id);
        await updateDoc(categoryRef, { name: currentCategory.name, imageUrl: currentCategory.imageUrl || '' });
      } else {
        await addDoc(collection(db, 'categories'), { name: currentCategory.name, imageUrl: currentCategory.imageUrl || '', order: categories.length });
      }
      setIsEditingCategory(false);
      setCurrentCategory({ name: '', imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, isEditingCategory ? OperationType.UPDATE : OperationType.CREATE, 'categories');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المنتجات المرتبطة به أيضاً.')) {
      try {
        await deleteDoc(doc(db, 'categories', categoryId));
        // Also delete associated products
        const productsToDelete = menuItems.filter(item => item.categoryId === categoryId);
        for (const product of productsToDelete) {
          await deleteDoc(doc(db, 'menuItems', product.id));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
      }
    }
  };

  const handleReorderCategory = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return;
    }

    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap elements
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];

    try {
      // Update order in Firestore for both swapped categories
      const batch = newCategories.map(async (cat, i) => {
        if (cat.id) {
          await updateDoc(doc(db, 'categories', cat.id), { order: i });
        }
      });
      await Promise.all(batch);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'categories');
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverPhone) return;
    setIsAddingDriver(true);
    try {
      await addDoc(collection(db, 'drivers'), {
        name: driverName,
        phone: driverPhone
      });
      setDriverName('');
      setDriverPhone('');
      alert('تم إضافة المندوب بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'drivers');
    } finally {
      setIsAddingDriver(false);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المندوب؟')) {
      try {
        await deleteDoc(doc(db, 'drivers', driverId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `drivers/${driverId}`);
      }
    }
  };

  const sendOrderToDriver = async (order: any, driverPhone: string, driverName: string) => {
    try {
      // Update order with driver info
      await updateDoc(doc(db, 'orders', order.id), {
        driverName,
        driverPhone
      });

      const itemsList = order.items.map((item: any) => 
        `- ${item.name} x${item.quantity} (${item.price * item.quantity} ج.م)`
      ).join('\n');

      let locationText = '';
      if (order.location?.address?.startsWith('http')) {
        locationText = `*رابط الموقع:* ${order.location.address}\n`;
      } else if (order.location?.address) {
        locationText = `*العنوان:* ${order.location.address}\n`;
      }

      const message = `*طلب جديد للتوصيل* 🛵\n\n` +
        `*رقم الطلب:* #${order.orderNumber || order.id.slice(-6).toUpperCase()}\n` +
        `*العميل:* ${order.customerName}\n` +
        `*الهاتف:* ${order.customerPhone}\n` +
        locationText +
        `\n*التفاصيل:*\n${itemsList}\n\n` +
        `*الإجمالي المطلوب:* ${order.totalAmount} ج.م\n` +
        `*طريقة الدفع:* ${order.paymentMethod === 'cash' ? 'كاش' : 'دفع إلكتروني'}`;

      sendWhatsAppMessage(driverPhone, message);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'preparing': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'out_for_delivery': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'preparing': return 'جاري التحضير';
      case 'out_for_delivery': return 'في الطريق';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  if (loading) {
    return <div className="min-h-[80vh] flex items-center justify-center text-yellow-500">جاري التحميل...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-bold text-white">لوحة التحكم</h1>
          {'Notification' in window && Notification.permission !== 'granted' && (
            <button
              onClick={() => {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    alert('تم تفعيل الإشعارات بنجاح!');
                  }
                });
              }}
              className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
            >
              <Bell size={16} />
              <span className="hidden sm:inline">تفعيل الإشعارات</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 bg-black/50 p-1 rounded-xl border border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-6 py-2 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'pos' ? 'neon-button' : 'text-slate-400 hover:text-white'}`}
          >
            <CreditCard size={18} /> الكاشير (POS)
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-lg font-bold transition-colors whitespace-nowrap relative ${activeTab === 'orders' ? 'neon-button' : 'text-slate-400 hover:text-white'}`}
          >
            الطلبات
            {orders.filter(o => {
              if (!o.createdAt) return false;
              const orderDate = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
              return orderDate >= today && o.status === 'pending';
            }).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[10px] font-bold items-center justify-center">
                  {orders.filter(o => {
                    if (!o.createdAt) return false;
                    const orderDate = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
                    return orderDate >= today && o.status === 'pending';
                  }).length > 9 ? '9+' : orders.filter(o => {
                    if (!o.createdAt) return false;
                    const orderDate = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
                    return orderDate >= today && o.status === 'pending';
                  }).length}
                </span>
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'neon-button' : 'text-slate-400 hover:text-white'}`}
          >
            الأقسام
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'products' ? 'neon-button' : 'text-slate-400 hover:text-white'}`}
          >
            المنتجات
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-6 py-2 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'accounts' ? 'neon-button' : 'text-slate-400 hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> الحسابات
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'settings' ? 'neon-button' : 'text-slate-400 hover:text-white'}`}
          >
            <Settings size={18} /> الإعدادات
          </button>
        </div>
      </div>

      {activeTab === 'pos' && (
        <POSSystem categories={categories} menuItems={menuItems} />
      )}

      {activeTab === 'accounts' && (
        <AccountsReport orders={orders} />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <CreditCard className="text-yellow-500" /> إعدادات الدفع
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">رقم الموبايل للتحويل (فودافون كاش، انستاباي، الخ)</label>
                <input
                  type="text"
                  value={paymentNumber}
                  onChange={(e) => setPaymentNumber(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="مثال: 01000000000"
                  dir="ltr"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="neon-button px-6 py-3 rounded-xl font-bold w-full disabled:opacity-50"
              >
                {isSavingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <User className="text-yellow-500" /> إضافة حساب موظف جديد
            </h2>
            <form onSubmit={handleCreateEmployee} className="space-y-4 max-w-md">
              {employeeMsg.text && (
                <div className={`p-3 rounded-lg text-sm text-center ${employeeMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/10 text-red-400 border border-red-500/50'}`}>
                  {employeeMsg.text}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">اسم الموظف</label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">كلمة المرور (6 أحرف على الأقل)</label>
                <input
                  type="password"
                  value={employeePassword}
                  onChange={(e) => setEmployeePassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  dir="ltr"
                  minLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingEmployee}
                className="neon-button px-6 py-3 rounded-xl font-bold w-full disabled:opacity-50"
              >
                {isCreatingEmployee ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Truck className="text-yellow-500" /> إدارة مناديب التوصيل
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handleAddDriver} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">اسم المندوب</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">رقم الهاتف (واتساب)</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                    dir="ltr"
                    placeholder="مثال: 01000000000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAddingDriver}
                  className="neon-button px-6 py-3 rounded-xl font-bold w-full disabled:opacity-50"
                >
                  {isAddingDriver ? 'جاري الإضافة...' : 'إضافة مندوب'}
                </button>
              </form>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">المناديب الحاليين</h3>
                {drivers.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">لا يوجد مناديب مضافين حالياً</p>
                ) : (
                  drivers.map(driver => (
                    <div key={driver.id} className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="text-white font-medium">{driver.name}</p>
                        <p className="text-slate-400 text-sm" dir="ltr">{driver.phone}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteDriver(driver.id)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="حذف المندوب"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-black/50 p-4 rounded-2xl border border-white/5">
            <h2 className="text-xl font-bold text-white">إحصائيات الطلبات</h2>
            <select
              value={ordersFilter}
              onChange={(e) => setOrdersFilter(e.target.value as 'today' | 'all')}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500 transition-colors"
            >
              <option value="today">طلبات اليوم</option>
              <option value="all">كل الطلبات</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-sm font-medium mb-2">إجمالي الطلبات ({ordersFilter === 'today' ? 'اليوم' : 'الكل'})</p>
              <p className="text-3xl font-black text-white">{filteredOrders.length}</p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-sm font-medium mb-2">قيد الانتظار ({ordersFilter === 'today' ? 'اليوم' : 'الكل'})</p>
              <p className="text-3xl font-black text-yellow-500">
                {filteredOrders.filter(o => o.status === 'pending').length}
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-sm font-medium mb-2">المبيعات ({ordersFilter === 'today' ? 'اليوم' : 'الكل'})</p>
              <p className="text-3xl font-black text-emerald-400">
                {filteredOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.totalAmount, 0)} ج.م
              </p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-sm font-medium mb-2">طلبات ملغاة ({ordersFilter === 'today' ? 'اليوم' : 'الكل'})</p>
              <p className="text-3xl font-black text-red-500">
                {filteredOrders.filter(o => o.status === 'cancelled').length}
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-black/50 border-b border-white/10 text-slate-300 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-bold">رقم الطلب</th>
                    <th className="px-6 py-4 font-bold">العميل</th>
                    <th className="px-6 py-4 font-bold">النوع</th>
                    <th className="px-6 py-4 font-bold">التفاصيل</th>
                    <th className="px-6 py-4 font-bold">الإجمالي</th>
                    <th className="px-6 py-4 font-bold">الدفع</th>
                    <th className="px-6 py-4 font-bold">المندوب</th>
                    <th className="px-6 py-4 font-bold">الحالة</th>
                    <th className="px-6 py-4 font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-black/50 px-2 py-1 rounded text-slate-400 border border-white/10">
                          {order.orderNumber || order.id.slice(-6).toUpperCase()}
                        </span>
                        <div className="text-xs text-slate-500 mt-1">
                          {order.createdAt ? format(order.createdAt.toDate(), 'PP p', { locale: ar }) : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <User size={14} className="text-slate-400" />
                          <span className="font-bold text-white">{order.customerName || 'عميل'}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Phone size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-300" dir="ltr">{order.customerPhone || '---'}</span>
                          {order.customerPhone && (
                            <button 
                              onClick={() => sendWhatsAppMessage(order.customerPhone, `أهلاً بك يا ${order.customerName || 'عميلنا العزيز'} 👋\nنتواصل معك من مطعم حرب بخصوص طلبك رقم #${order.orderNumber || order.id.slice(-6).toUpperCase()}`)}
                              className="text-emerald-400 hover:text-emerald-300 transition-colors ml-1"
                              title="مراسلة عبر واتساب"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" />
                          {order.location?.address?.startsWith('http') ? (
                            <a 
                              href={order.location.address} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-400 hover:text-cyan-300 max-w-[150px] truncate flex items-center gap-1"
                              title="فتح في خرائط جوجل"
                            >
                              عرض الموقع على الخريطة <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 max-w-[150px] truncate" title={order.location?.address || '---'}>
                              {order.location?.address || '---'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {order.orderType === 'dine_in' ? (
                          <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-bold">صالة {order.tableNumber ? `(${order.tableNumber})` : ''}</span>
                        ) : order.orderType === 'takeaway' ? (
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold">تيك أواي</span>
                        ) : (
                          <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-bold">توصيل</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <ul className="text-sm text-slate-300 max-w-[200px]">
                          {order.items.map((item: any, idx: number) => (
                            <li key={idx} className="truncate" title={`${item.quantity}x ${item.name} ${item.size ? `(${item.size})` : ''}`}>
                              <span className="font-bold text-yellow-500">{item.quantity}x</span> {item.name} {item.size ? `(${item.size})` : ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 font-black text-yellow-500" dir="ltr">
                        {order.totalAmount} ج.م
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1 text-sm text-slate-300">
                            <CreditCard size={14} />
                            {order.paymentMethod === 'cash' ? 'كاش' : 'دفع إلكتروني'}
                          </div>
                          
                          <select
                            value={order.paymentStatus || 'pending'}
                            onChange={(e) => updatePaymentStatus(order, e.target.value)}
                            className={`text-xs font-bold rounded p-1 border ${
                              order.paymentStatus === 'paid' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : order.paymentStatus === 'awaiting_confirmation'
                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}
                          >
                            <option value="pending" className="bg-slate-900 text-yellow-500">غير مدفوع</option>
                            <option value="awaiting_confirmation" className="bg-slate-900 text-orange-400">بانتظار التأكيد</option>
                            <option value="paid" className="bg-slate-900 text-emerald-400">مدفوع</option>
                          </select>

                          {order.paymentProofUrl && (
                            <button 
                              onClick={() => setSelectedProof(order.paymentProofUrl)}
                              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1"
                            >
                              <ImageIcon size={12} />
                              عرض الإثبات
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {order.driverName ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm text-white font-bold">
                              <Truck size={14} className="text-emerald-400" />
                              {order.driverName}
                            </div>
                            <div className="text-xs text-slate-400" dir="ltr">{order.driverPhone}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">لم يتم التعيين</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order, e.target.value)}
                            className="bg-black/50 border border-white/10 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2"
                          >
                            <option value="pending">قيد الانتظار</option>
                            <option value="preparing">جاري التحضير</option>
                            <option value="out_for_delivery">في الطريق</option>
                            <option value="delivered">تم التوصيل</option>
                            <option value="cancelled">إلغاء</option>
                          </select>
                          
                          <div className="flex gap-2">
                            {order.customerPhone && (
                              <button
                                onClick={() => {
                                  let message = '';
                                  if (order.status === 'preparing') {
                                    message = `أهلاً بك يا ${order.customerName || 'عميلنا العزيز'} 👋\n\nتم تأكيد طلبك رقم #${order.orderNumber || order.id.slice(-6).toUpperCase()} من مطعم حرب وهو الآن قيد التحضير 👨‍🍳🔥\n\nالإجمالي: ${order.totalAmount} ج.م\n\nشكراً لاختيارك مطعم حرب!`;
                                  } else if (order.status === 'out_for_delivery') {
                                    message = `أهلاً بك يا ${order.customerName || 'عميلنا العزيز'} 👋\n\nطلبك رقم #${order.orderNumber || order.id.slice(-6).toUpperCase()} خرج للتوصيل وهو في الطريق إليك الآن 🛵💨\n\nاستعد لاستلام أشهى الأكلات من مطعم حرب!`;
                                  } else if (order.status === 'delivered') {
                                    message = `أهلاً بك يا ${order.customerName || 'عميلنا العزيز'} 👋\n\nتم توصيل طلبك رقم #${order.orderNumber || order.id.slice(-6).toUpperCase()} بنجاح ✅\n\nنتمنى لك وجبة شهية من مطعم حرب!`;
                                  } else {
                                    message = `أهلاً بك يا ${order.customerName || 'عميلنا العزيز'} 👋\nنتواصل معك من مطعم حرب بخصوص طلبك رقم #${order.orderNumber || order.id.slice(-6).toUpperCase()}`;
                                  }
                                  sendWhatsAppMessage(order.customerPhone, message);
                                }}
                                className="flex-1 bg-emerald-500/20 text-emerald-400 p-2 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1 text-xs"
                                title="إرسال تحديث للعميل عبر واتساب"
                              >
                                <MessageCircle size={14} /> للعميل
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500/30 transition-colors"
                              title="حذف الطلب"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          {(order.status === 'preparing' || order.status === 'out_for_delivery') && drivers.length > 0 && (
                            <div className="flex gap-2 mt-1">
                              <select 
                                id={`driver-select-${order.id}`}
                                className="bg-black/50 border border-white/10 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2"
                                defaultValue=""
                              >
                                <option value="" disabled>اختر مندوب</option>
                                {drivers.map(driver => (
                                  <option key={driver.id} value={driver.phone}>{driver.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  const select = document.getElementById(`driver-select-${order.id}`) as HTMLSelectElement;
                                  if (select && select.value) {
                                    const selectedDriver = drivers.find(d => d.phone === select.value);
                                    sendOrderToDriver(order, select.value, selectedDriver?.name || 'مندوب توصيل');
                                  } else {
                                    alert('يرجى اختيار مندوب أولاً');
                                  }
                                }}
                                className="bg-blue-500/20 text-blue-400 p-2 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center justify-center"
                                title="إرسال للمندوب"
                              >
                                <Truck size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">لا توجد طلبات حتى الآن</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="glass-panel p-6 rounded-2xl border border-white/5 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">
                {isEditing ? 'تعديل منتج' : 'إضافة منتج جديد'}
              </h2>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">اسم المنتج</label>
                  <input
                    type="text"
                    required
                    value={currentProduct.name}
                    onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">الوصف</label>
                  <textarea
                    value={currentProduct.description}
                    onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500 h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">السعر</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={currentProduct.price}
                      onChange={(e) => setCurrentProduct({...currentProduct, price: Number(e.target.value)})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">القسم</label>
                    <select
                      value={currentProduct.categoryId}
                      onChange={(e) => setCurrentProduct({...currentProduct, categoryId: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                    >
                      <option value="" disabled>اختر القسم</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">الصورة</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer bg-black/50 border border-white/10 hover:border-yellow-500/50 rounded-xl px-4 py-2 text-center transition-colors">
                        <span className="text-sm text-yellow-500 font-medium">
                          {isUploadingProductImage ? 'جاري الرفع...' : 'اختر صورة من الجهاز'}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(e, 'product')}
                          disabled={isUploadingProductImage}
                        />
                      </label>
                      <span className="text-slate-500 text-sm">أو</span>
                    </div>
                    <input
                      type="url"
                      value={currentProduct.imageUrl || ''}
                      onChange={(e) => setCurrentProduct({...currentProduct, imageUrl: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                      placeholder="أدخل رابط الصورة هنا (https://...)"
                      dir="ltr"
                    />
                  </div>
                  {currentProduct.imageUrl && (
                    <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                      <img src={currentProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="submit" className="flex-1 neon-button py-2 rounded-xl font-bold">
                    {isEditing ? 'تحديث' : 'إضافة'}
                  </button>
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsEditing(false);
                        setCurrentProduct({ name: '', description: '', price: 0, categoryId: MENU_CATEGORIES[0].id, imageUrl: '' });
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.map(item => (
                <div key={item.id} className="glass-panel p-4 rounded-2xl border border-white/5 flex gap-4">
                  <div className="w-20 h-20 rounded-xl bg-black/50 overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-white">{item.name}</h3>
                    <p className="text-sm text-slate-400 mb-1">{categories.find(c => c.id === item.categoryId)?.name || 'بدون قسم'}</p>
                    <p className="text-yellow-500 text-sm font-bold" dir="ltr">{item.price} ج.م</p>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => {
                          setCurrentProduct(item);
                          setIsEditing(true);
                        }}
                        className="p-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(item.id)}
                        className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {menuItems.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500">
                  لا توجد منتجات مضافة بعد
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="glass-panel p-6 rounded-2xl border border-white/5 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">
                {isEditingCategory ? 'تعديل قسم' : 'إضافة قسم جديد'}
              </h2>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">اسم القسم</label>
                  <input
                    type="text"
                    required
                    value={currentCategory.name}
                    onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">صورة القسم</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer bg-black/50 border border-white/10 hover:border-yellow-500/50 rounded-xl px-4 py-2 text-center transition-colors">
                        <span className="text-sm text-yellow-500 font-medium">
                          {isUploadingCategoryImage ? 'جاري الرفع...' : 'اختر صورة من الجهاز'}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(e, 'category')}
                          disabled={isUploadingCategoryImage}
                        />
                      </label>
                      <span className="text-slate-500 text-sm">أو</span>
                    </div>
                    <input
                      type="url"
                      value={currentCategory.imageUrl || ''}
                      onChange={(e) => setCurrentCategory({...currentCategory, imageUrl: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                      placeholder="أدخل رابط الصورة هنا (https://...)"
                      dir="ltr"
                    />
                  </div>
                  {currentCategory.imageUrl && (
                    <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                      <img src={currentCategory.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="submit" className="flex-1 neon-button py-2 rounded-xl font-bold">
                    {isEditingCategory ? 'تحديث' : 'إضافة'}
                  </button>
                  {isEditingCategory && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsEditingCategory(false);
                        setCurrentCategory({ name: '', imageUrl: '' });
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat, index) => (
                <div key={cat.id} className="glass-panel p-4 rounded-2xl border border-white/5 flex gap-4 items-center">
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleReorderCategory(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button 
                      onClick={() => handleReorderCategory(index, 'down')}
                      disabled={index === categories.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  <div className="w-16 h-16 rounded-xl bg-black/50 overflow-hidden flex-shrink-0">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow flex justify-between items-center">
                    <h3 className="font-bold text-white text-lg">{cat.name}</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setCurrentCategory(cat);
                          setIsEditingCategory(true);
                        }}
                        className="p-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500">
                  لا توجد أقسام مضافة بعد
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-3xl w-full bg-zinc-900 rounded-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon size={20} className="text-yellow-500" />
                إثبات الدفع
              </h3>
              <button 
                onClick={() => setSelectedProof(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-black/30">
              <img 
                src={selectedProof} 
                alt="إثبات الدفع" 
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-4 border-t border-white/10 bg-black/50 flex justify-end">
              <a 
                href={selectedProof} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                فتح في نافذة جديدة
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
