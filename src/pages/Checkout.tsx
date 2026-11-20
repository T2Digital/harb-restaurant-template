import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, runTransaction, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { PAYMENT_METHODS } from '../constants';
import { MapPin, CreditCard, Phone, User, CheckCircle2, Copy, Rocket, Upload, Image as ImageIcon, X, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Checkout() {
  useDocumentTitle('مطعم حرب | إتمام الطلب');
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const locationObj = useLocation();

  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].id);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentNumber, setPaymentNumber] = useState('01000315777'); // Default
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);

  // CRM States
  const [isFetchingCustomer, setIsFetchingCustomer] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [isNewAddress, setIsNewAddress] = useState(true);
  
  // Payment proof states
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(locationObj.search);
    const qName = searchParams.get('name');
    const qPhone = searchParams.get('phone');
    const qAddress = searchParams.get('address');
    const qPaymentMethod = searchParams.get('paymentMethod');
    const qAutoSubmit = searchParams.get('autoSubmit');

    if (qName) setName(qName);
    if (qPhone) setPhone(qPhone);
    if (qAddress) setAddress(qAddress);
    if (qPaymentMethod) setPaymentMethod(qPaymentMethod);

    if (qAutoSubmit === 'true' && !autoSubmitTriggered && qName && qPhone && qAddress) {
      setAutoSubmitTriggered(true);
      // We need to wait for state to update before submitting
      setTimeout(() => {
        const form = document.getElementById('checkout-form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }, 500);
    }
  }, [locationObj.search, autoSubmitTriggered]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().paymentNumber) {
        setPaymentNumber(docSnap.data().paymentNumber);
      }
    });
    return () => unsubscribe();
  }, []);

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0 && !success) {
      navigate('/cart');
    }
  }, [items.length, success, navigate]);

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value;
    setPhone(newPhone);

    if (newPhone.length >= 10) {
      setIsFetchingCustomer(true);
      try {
        const customerDoc = await getDoc(doc(db, 'customers', newPhone));
        if (customerDoc.exists()) {
          const data = customerDoc.data();
          if (data.name) setName(data.name);
          if (data.addresses && data.addresses.length > 0) {
            setSavedAddresses(data.addresses);
            setAddress(data.addresses[0]);
            setIsNewAddress(false);
          }
        } else {
          setSavedAddresses([]);
          setIsNewAddress(true);
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
      } finally {
        setIsFetchingCustomer(false);
      }
    } else {
      setSavedAddresses([]);
      setIsNewAddress(true);
    }
  };

  if (items.length === 0 && !success) {
    return null;
  }

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          const mapsLink = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
          setAddress(mapsLink);
        },
        (error) => {
          console.error('Error getting location', error);
          alert('تعذر الحصول على الموقع. يرجى إدخال العنوان يدوياً.');
        }
      );
    } else {
      alert('متصفحك لا يدعم تحديد الموقع.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('حجم الصورة كبير جداً. الحد الأقصى هو 5 ميجابايت.');
        return;
      }
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setProofImage(null);
    setProofPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('يرجى إكمال جميع البيانات المطلوبة.');
      return;
    }

    if (paymentMethod !== 'cash' && !proofImage) {
      alert('يرجى إرفاق صورة إثبات الدفع للطلبات المدفوعة إلكترونياً.');
      return;
    }

    setLoading(true);
    try {
      let proofUrl = null;
      
      if (paymentMethod !== 'cash' && proofImage) {
        setUploadingProof(true);
        proofUrl = await uploadImageToImgBB(proofImage);
        setUploadingProof(false);
        
        if (!proofUrl) {
          alert('حدث خطأ أثناء رفع صورة إثبات الدفع. يرجى المحاولة مرة أخرى.');
          setLoading(false);
          return;
        }
      }

      const orderData: any = {
        customerId: user?.uid || null,
        customerName: name,
        customerPhone: phone,
        items: items.map(i => ({
          id: i.menuItemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.size || null,
          notes: i.notes || null
        })),
        totalAmount: total,
        status: 'pending',
        paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'awaiting_confirmation',
        location: location ? { ...location, address: address || '' } : { lat: 0, lng: 0, address: address || '' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (proofUrl) {
        orderData.paymentProofUrl = proofUrl;
      }

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
        console.error("Transaction error:", e);
        handleFirestoreError(e, OperationType.WRITE, 'settings/orderCounter');
      }

      try {
        await addDoc(collection(db, 'orders'), {
          ...orderData,
          orderNumber: newOrderNumber
        });
      } catch (e) {
        console.error("addDoc error:", e);
        handleFirestoreError(e, OperationType.CREATE, 'orders');
      }
      
      // Update Customer CRM Data
      const customerRef = doc(db, 'customers', phone);
      try {
        const customerDoc = await getDoc(customerRef);
        
        if (customerDoc.exists()) {
          const updates: any = {
            name: name,
            lastOrderAt: serverTimestamp(),
            totalOrders: (customerDoc.data().totalOrders || 0) + 1
          };
          if (isNewAddress && address.trim() !== '') {
            updates.addresses = arrayUnion(address);
          }
          await updateDoc(customerRef, updates);
        } else {
          await setDoc(customerRef, {
            phone: phone,
            name: name,
            addresses: [address],
            createdAt: serverTimestamp(),
            lastOrderAt: serverTimestamp(),
            totalOrders: 1
          });
        }
      } catch (crmError) {
        console.error("Error saving customer data:", crmError);
        // Don't block order creation if CRM update fails
      }
      
      setSuccess(true);
      clearCart();
      
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (error) {
      console.error("Checkout error:", error);
      alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPayment = PAYMENT_METHODS.find(p => p.id === paymentMethod);
  const isOnlinePayment = paymentMethod !== 'cash';

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]"
        >
          <Rocket size={48} className="text-yellow-500" />
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-4 neon-text">تم إرسال طلبك بنجاح!</h2>
        <p className="text-slate-400 mb-8 text-lg">شكراً لطلبك من مطعم حرب. جاري تحضير طلبك الآن.</p>
        <p className="text-sm text-yellow-500 animate-pulse">سيتم تحويلك للرئيسية...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white neon-text">إتمام الطلب</h1>
        <button 
          onClick={() => navigate('/my-orders')}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-yellow-500 px-4 py-2 rounded-xl transition-colors border border-white/10"
        >
          <History size={18} />
          <span>طلباتي السابقة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6 glass-panel p-6 rounded-2xl border border-white/5">
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">رقم الموبايل</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500" size={20} />
              <input
                type="tel"
                required
                value={phone}
                onChange={handlePhoneChange}
                className="w-full bg-black/50 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors text-left"
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
              {isFetchingCustomer && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {savedAddresses.length > 0 && (
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle2 size={12} /> أهلاً بك مجدداً! تم استرجاع بياناتك.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">الاسم</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500" size={20} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="الاسم بالكامل"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">العنوان</label>
            
            {savedAddresses.length > 0 && (
              <div className="mb-3 space-y-2">
                {savedAddresses.map((addr, idx) => (
                  <label key={idx} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${!isNewAddress && address === addr ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-black/30 border-white/5 hover:border-white/20'}`}>
                    <input 
                      type="radio" 
                      name="address_selection" 
                      checked={!isNewAddress && address === addr}
                      onChange={() => {
                        setAddress(addr);
                        setIsNewAddress(false);
                      }}
                      className="mt-1 text-yellow-500 focus:ring-yellow-500 bg-black border-white/20"
                    />
                    <span className="text-sm text-slate-300 leading-relaxed">{addr}</span>
                  </label>
                ))}
                
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isNewAddress ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-black/30 border-white/5 hover:border-white/20'}`}>
                  <input 
                    type="radio" 
                    name="address_selection" 
                    checked={isNewAddress}
                    onChange={() => {
                      setAddress('');
                      setIsNewAddress(true);
                    }}
                    className="text-yellow-500 focus:ring-yellow-500 bg-black border-white/20"
                  />
                  <span className="text-sm text-white font-medium">إضافة عنوان جديد</span>
                </label>
              </div>
            )}

            {isNewAddress && (
              <>
                <div className="relative mb-2">
                  <MapPin className="absolute right-3 top-3 text-yellow-500" size={20} />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors min-h-[100px]"
                    placeholder="تفاصيل العنوان (الشارع، العمارة، الدور، الشقة) - اختياري"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 text-yellow-500 px-4 py-3 rounded-xl font-medium hover:bg-white/10 transition-colors border border-white/5"
                >
                  <MapPin size={18} />
                  تحديد موقعي الحالي
                </button>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    paymentMethod === method.id
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <CreditCard size={24} className="mb-2" />
                  <span className="text-sm font-bold text-center">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedPayment?.ussd && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-yellow-300 mb-2">كود التحويل السريع (شامل المبلغ والرقم):</p>
              <div className="flex items-center justify-center gap-2 bg-black/50 px-4 py-2 rounded-lg border border-yellow-500/30 font-mono text-lg font-bold text-white" dir="ltr">
                {selectedPayment.ussd.replace('*Amount*', total.toString()).replace(/01[0-9]{9}/, paymentNumber)}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPayment.ussd!.replace('*Amount*', total.toString()).replace(/01[0-9]{9}/, paymentNumber));
                    alert('تم نسخ الكود');
                  }}
                  className="ml-2 text-slate-400 hover:text-yellow-500"
                >
                  <Copy size={20} />
                </button>
              </div>
              <a 
                href={`tel:${selectedPayment.ussd.replace('*Amount*', total.toString()).replace(/01[0-9]{9}/, paymentNumber).replace(/#/g, '%23')}`}
                className="inline-block mt-3 neon-button px-6 py-2 rounded-lg font-medium transition-colors"
              >
                اتصل بالكود الآن
              </a>
              <p className="text-xs text-yellow-500 mt-2">المبلغ المطلوب: {total} ج.م</p>
            </div>
          )}

          {selectedPayment?.address && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-yellow-300 mb-2">عنوان انستا باي:</p>
              <div className="flex items-center justify-center gap-2 bg-black/50 px-4 py-2 rounded-lg border border-yellow-500/30 font-mono text-lg font-bold text-white" dir="ltr">
                {paymentNumber}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentNumber);
                    alert('تم نسخ العنوان');
                  }}
                  className="ml-2 text-slate-400 hover:text-yellow-500"
                >
                  <Copy size={20} />
                </button>
              </div>
              <p className="text-xs text-yellow-500 mt-2">المبلغ المطلوب: {total} ج.م</p>
            </div>
          )}

          {/* Payment Proof Upload Section */}
          {isOnlinePayment && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                إثبات الدفع (سكرين شوت للتحويل) <span className="text-red-500">*</span>
              </label>
              
              {!proofPreview ? (
                <div 
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-yellow-500/50 transition-colors cursor-pointer bg-black/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                  <p className="text-sm text-slate-300 mb-1">اضغط لرفع صورة إثبات الدفع</p>
                  <p className="text-xs text-slate-500">PNG, JPG, JPEG (الحد الأقصى 5MB)</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-white/20 bg-black/50 p-2">
                  <img 
                    src={proofPreview} 
                    alt="إثبات الدفع" 
                    className="w-full h-48 object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-4 right-4 bg-red-500/80 text-white p-2 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="mt-2 text-center text-sm text-yellow-500 font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    تم إرفاق الصورة بنجاح
                  </div>
                </div>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/png, image/jpeg, image/jpg"
                className="hidden"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploadingProof || (isOnlinePayment && !proofImage)}
            className="w-full neon-button px-8 py-4 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg flex justify-center items-center gap-2"
          >
            {loading || uploadingProof ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                {uploadingProof ? 'جاري رفع الصورة...' : 'جاري تأكيد الطلب...'}
              </>
            ) : (
              `تأكيد الطلب (${total} ج.م)`
            )}
          </button>
        </form>

        <div className="hidden md:block">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 sticky top-24">
            <h3 className="text-xl font-bold text-white mb-4">ملخص الطلب</h3>
            <ul className="divide-y divide-white/10 mb-4">
              {items.map((item) => (
                <li key={item.id} className="py-4 flex justify-between text-sm">
                  <span className="text-slate-300">{item.quantity}x {item.name} {item.size ? `(${item.size})` : ''}</span>
                  <span className="font-bold text-yellow-500" dir="ltr">{item.price * item.quantity} ج.م</span>
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-lg font-bold text-white">الإجمالي</span>
              <span className="text-2xl font-black neon-text" dir="ltr">{total} ج.م</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
