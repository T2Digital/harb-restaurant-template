import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Bot, MapPin, CreditCard, Rocket, Shield, Star, Flame } from 'lucide-react';
import { MENU_ITEMS } from '../constants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

export default function Home() {
  useDocumentTitle('مطعم حرب | الرئيسية');
  
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'menuItems'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setMenuItems(MENU_ITEMS);
      } else {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setMenuItems(items);
      }
    });
    return unsubscribe;
  }, []);

  const harbCannonItems = menuItems.filter(item => item.categoryId === 'harb_cannon').slice(0, 3);
  const popularSandwiches = menuItems.filter(item => item.categoryId === 'sandwiches' || item.categoryId === 'burger').slice(0, 3);
  const popularMeals = menuItems.filter(item => item.categoryId === 'meals').slice(0, 3);

  const renderSection = (title: string, items: any[], bgClass: string = "bg-black") => {
    if (items.length === 0) return null;
    return (
      <section className={`py-20 px-4 relative z-10 ${bgClass}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
              <Star className="text-yellow-500" size={32} />
              {title}
              <Star className="text-yellow-500" size={32} />
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-500 to-amber-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {items.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass-panel rounded-2xl overflow-hidden border border-yellow-500/20 group"
              >
                <div className="h-48 bg-zinc-900 relative overflow-hidden">
                  <img 
                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/400`} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                  <div className="absolute bottom-4 right-4 bg-yellow-500 text-black font-bold px-3 py-1 rounded-lg">
                    {item.price} ج.م
                  </div>
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                  {item.description && <p className="text-slate-400 text-sm mb-4">{item.description}</p>}
                  <Link to="/menu" className="text-yellow-500 font-bold hover:text-yellow-400 transition-colors inline-flex items-center gap-1">
                    اطلب الآن <Utensils size={16} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/burger-grill/1920/1080?blur=2" 
            alt="Grill Restaurant" 
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-yellow-500/30 text-yellow-500 mb-6">
              <Flame size={16} />
              <span className="text-sm font-medium tracking-wider">طعم لا يقاوم</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              مطعم <span className="neon-text">حرب</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              أشهى المأكولات والمشاوي والسندوتشات. اطلب الآن واستمتع بتجربة طعام من عالم آخر.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/menu" 
                className="neon-button px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                <Utensils size={24} />
                تصفح المنيو
              </Link>
              <Link 
                to="/ai-waiter" 
                className="glass-panel px-8 py-4 rounded-xl font-bold text-lg text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 border border-white/20"
              >
                <Bot size={24} />
                اطلب مع الجارسون الذكي
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Harb Cannon Section */}
      {renderSection("مدفع حرب", harbCannonItems, "bg-zinc-950")}

      {/* Popular Sandwiches Section */}
      {renderSection("أشهر سندوتشات حرب", popularSandwiches, "bg-black")}

      {/* Popular Meals Section */}
      {renderSection("أشهر وجبات حرب", popularMeals, "bg-zinc-950")}

      {/* Features Section */}
      <section className="py-20 px-4 relative z-10 bg-black border-t border-yellow-500/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">لماذا تختار حرب؟</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-500 to-amber-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Bot size={32} className="text-yellow-500" />}
              title="جارسون ذكي"
              description="تحدث مع الجارسون الذكي بالعامية المصرية واطلب أكلك بكل سهولة."
            />
            <FeatureCard 
              icon={<MapPin size={32} className="text-yellow-500" />}
              title="توصيل سريع"
              description="شارك موقعك بضغطة زر لتوصيل أسرع وأدق أينما كنت."
            />
            <FeatureCard 
              icon={<CreditCard size={32} className="text-yellow-500" />}
              title="دفع إلكتروني آمن"
              description="ادفع بسهولة عبر محافظ الموبايل وانستا باي مع إرفاق إثبات الدفع."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="glass-panel p-8 rounded-2xl border border-yellow-500/10 hover:border-yellow-500/30 transition-all group bg-yellow-500/5"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}
