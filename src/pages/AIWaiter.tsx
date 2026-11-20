import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { MENU_ITEMS } from '../constants';
import { useCart } from '../CartContext';
import { useNavigate } from 'react-router-dom';
import { Bot, User, Send, ShoppingBag, Menu as MenuIcon, CreditCard, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function AIWaiter() {
  useDocumentTitle('مطعم حرب | الجارسون الذكي');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>(() => {
    const saved = sessionStorage.getItem('harb_ai_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
    return [{ role: 'model', text: 'يا هلا بيك يا فندم في مطعم حرب! أؤمرني، تحب تاكل إيه النهاردة؟' }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addItem, items } = useCart();
  const navigate = useNavigate();
  const [dbMenuItems, setDbMenuItems] = useState<MenuItem[]>([]);

  // Create chat session
  const chatRef = useRef<any>(null);

  useEffect(() => {
    sessionStorage.setItem('harb_ai_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const fetchMenuAndInitChat = async () => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          console.error("Gemini API Key is missing.");
          setApiKeyMissing(true);
          return;
        }

        const ai = new GoogleGenAI({ apiKey });

        const snapshot = await getDocs(collection(db, 'menuItems'));
        let fetchedItems: MenuItem[] = [];
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            fetchedItems.push({ id: doc.id, ...doc.data() } as MenuItem);
          });
        } else {
          fetchedItems = MENU_ITEMS as MenuItem[];
        }
        setDbMenuItems(fetchedItems);

        // Initialize chat session with system instructions
        const menuContext = fetchedItems.map(item => 
          `- ${item.name} (ID: ${item.id}): ${item.price} ج.م ${item.sizes ? `(أحجام: ${item.sizes.map(s => `${s.name} بـ ${s.price}`).join('، ')})` : ''} ${item.description ? `(${item.description})` : ''}`
        ).join('\n');

        const addToCartFunction: FunctionDeclaration = {
          name: 'addToCart',
          description: 'Add an item from the menu to the customer\'s cart.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              menuItemId: { type: Type.STRING, description: 'The ID of the menu item (e.g., s1, g2, hc3).' },
              quantity: { type: Type.NUMBER, description: 'The number of items to add.' },
              size: { type: Type.STRING, description: 'The size of the item, if applicable (e.g., كبير, صغير, 1/2).' },
              notes: { type: Type.STRING, description: 'Any special instructions or notes for the item.' }
            },
            required: ['menuItemId', 'quantity']
          }
        };

        const goToCheckoutWithDataFunction: FunctionDeclaration = {
          name: 'goToCheckoutWithData',
          description: 'Navigate the customer to the checkout page to complete their order. Use this when the customer wants to pay online OR cash on delivery. Pass the collected data to pre-fill the form.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              customerName: { type: Type.STRING, description: 'Customer name' },
              customerPhone: { type: Type.STRING, description: 'Customer phone number' },
              address: { type: Type.STRING, description: 'Delivery address' },
              paymentMethod: { type: Type.STRING, description: 'The chosen payment method (e.g., cash, vodafone_cash, instapay)' },
              autoSubmit: { type: Type.BOOLEAN, description: 'Set to true ONLY if paymentMethod is cash, so the order submits automatically.' }
            },
            required: ['customerName', 'customerPhone', 'address', 'paymentMethod', 'autoSubmit']
          }
        };

        chatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: `أنت جارسون ذكي في مطعم "حرب" في مصر.
تتحدث باللهجة المصرية العامية الراقية والمحترمة (يا فندم، تحت أمرك، من عينيا).
مهمتك هي مساعدة العميل في اختيار الطعام، الإجابة على أسئلته حول المنيو، وأخذ طلبه.
المنيو الخاص بنا:
${menuContext}

عندما يطلب العميل شيئاً، تأكد من الكمية والحجم (إذا كان متوفراً).
استخدم أداة addToCart لإضافة العناصر إلى عربة التسوق الخاصة بالعميل بعد التأكد من طلبه.
إذا كان الطلب غير واضح، اسأله بلطف للتوضيح.
لا تخترع أصنافاً غير موجودة في المنيو.
كن ودوداً ومختصراً في ردودك.
عندما يطلب العميل الدفع أو إنهاء الطلب، اسأله عن:
1. طريقة الدفع المفضلة (كاش عند الاستلام، فودافون كاش، اورانج كاش، اتصالات كاش، وي باي، انستا باي).
2. اسمه بالكامل.
3. رقم هاتفه.
4. عنوان التوصيل بالتفصيل.

بمجرد أن يزودك العميل بجميع هذه البيانات (الاسم، الهاتف، العنوان، طريقة الدفع)، استخدم أداة goToCheckoutWithData لتوجيهه لصفحة الدفع.
إذا اختار الدفع "كاش"، اجعل autoSubmit = true.
إذا اختار الدفع الإلكتروني، اجعل autoSubmit = false وأخبره أنه سيتم توجيهه لصفحة الدفع لرفع صورة إثبات التحويل (سكرين شوت).
في نهاية كل رد، اقترح على العميل خطوة تالية (مثلاً: "تحب أضيفلك حاجة تانية؟"، "تحب تشوف المنيو؟"، "نحاسب على كده؟").
إذا واجهت أي خطأ أو لم تفهم العميل، رد بذكاء ولطف: "عذراً يا فندم، ممكن توضح طلبك أكتر عشان أقدر أساعدك بأفضل شكل؟"`,
            tools: [{ functionDeclarations: [addToCartFunction, goToCheckoutWithDataFunction] }]
          }
        });
      } catch (error) {
        console.error("Error initializing chat:", error);
      }
    };

    fetchMenuAndInitChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage });
      
      let responseText = response.text || '';
      
      // Handle function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'addToCart') {
            const { menuItemId, quantity, size, notes } = call.args as any;
            const menuItem = dbMenuItems.find(item => item.id === menuItemId);
            
            if (menuItem) {
              let price = menuItem.price;
              if (size && menuItem.sizes) {
                const sizeObj = menuItem.sizes.find(s => s.name === size);
                if (sizeObj) price = sizeObj.price;
              }
              
              addItem({
                menuItemId,
                name: menuItem.name,
                price,
                quantity: quantity || 1,
                size,
                notes
              });
              
              responseText += `\n\n(تم إضافة ${quantity} ${menuItem.name} ${size ? `حجم ${size}` : ''} للريسيت بنجاح يا فندم!)`;
            }
          } else if (call.name === 'goToCheckoutWithData') {
            const { customerName, customerPhone, address, paymentMethod, autoSubmit } = call.args as any;
            
            // Determine the actual payment method value for the checkout page
            let checkoutPaymentMethod = 'cash';
            if (paymentMethod && paymentMethod.toLowerCase() !== 'cash' && paymentMethod.toLowerCase() !== 'كاش') {
              checkoutPaymentMethod = 'vodafone_cash'; // Default to vodafone_cash for any online payment, user can change it
            }

            const queryParams = new URLSearchParams({
              name: customerName || '',
              phone: customerPhone || '',
              address: address || '',
              paymentMethod: checkoutPaymentMethod,
              autoSubmit: autoSubmit ? 'true' : 'false'
            });

            if (autoSubmit) {
              responseText += `\n\n(تم تأكيد طلبك يا فندم، جاري إرسال الطلب للمطعم...)`;
            } else {
              responseText += `\n\n(جاري تحويلك لصفحة الدفع لرفع إثبات التحويل يا فندم...)`;
            }
            
            setTimeout(() => {
              navigate(`/checkout?${queryParams.toString()}`);
            }, 2000);
          }
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'عذراً يا فندم، حصلت مشكلة في النظام. ممكن تكرر طلبك؟' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    // Use a small timeout to allow state to update before submitting
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 neon-text">
          <Bot className="text-yellow-500" size={36} />
          الجارسون الذكي
        </h1>
        <button 
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-lg font-bold hover:bg-yellow-500/20 transition-colors border border-yellow-500/30"
        >
          <ShoppingBag size={20} />
          الريسيت
        </button>
      </div>

      <div className="flex-grow glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col">
        {apiKeyMissing ? (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle size={64} className="text-red-500 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">عذراً، الجارسون الذكي غير متاح حالياً</h3>
            <p className="text-slate-400 max-w-md">
              يرجى التأكد من إضافة مفتاح Gemini API (GEMINI_API_KEY) في إعدادات Vercel لكي يعمل الجارسون الذكي بشكل صحيح.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-grow p-6 overflow-y-auto space-y-6">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-white/10' : 'bg-yellow-500/20 border border-yellow-500/30'}`}>
                    {msg.role === 'user' ? <User size={20} className="text-slate-300" /> : <Bot size={24} className="text-yellow-500" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-yellow-500 text-black rounded-tr-none font-medium' : 'bg-black/50 text-slate-300 border border-white/10 rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <Bot size={24} className="text-yellow-500" />
                  </div>
                  <div className="bg-black/50 border border-white/10 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-black/50 border-t border-white/5">
              {/* Quick Actions */}
              {!loading && messages[messages.length - 1].role === 'model' && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => handleQuickAction('عايز أشوف المنيو')}
                    className="flex items-center gap-1 whitespace-nowrap bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-full text-sm transition-colors border border-white/10"
                  >
                    <MenuIcon size={14} />
                    عرض المنيو
                  </button>
                  <button
                    onClick={() => handleQuickAction('عايز أطلب')}
                    className="flex items-center gap-1 whitespace-nowrap bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-full text-sm transition-colors border border-white/10"
                  >
                    <ShoppingBag size={14} />
                    عايز أطلب
                  </button>
                  <button
                    onClick={() => handleQuickAction('الحساب')}
                    className="flex items-center gap-1 whitespace-nowrap bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-full text-sm transition-colors border border-white/10"
                  >
                    <CreditCard size={14} />
                    إنهاء الطلب
                  </button>
                </div>
              )}
              
              <form id="chat-form" onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب طلبك هنا..."
                  className="flex-grow bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-yellow-500 text-black w-12 h-12 rounded-xl flex items-center justify-center hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  <Send size={20} className="mr-1" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
