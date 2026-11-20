import React, { useState, useEffect } from 'react';
import { MENU_CATEGORIES, MENU_ITEMS } from '../constants';
import { useCart } from '../CartContext';
import { Plus, Minus, Receipt, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, Category } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Menu() {
  useDocumentTitle('مطعم حرب | المنيو');
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    return sessionStorage.getItem('harb_active_category') || '';
  });
  const { addItem, items } = useCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCategory) {
      sessionStorage.setItem('harb_active_category', activeCategory);
    }
  }, [activeCategory]);

  useEffect(() => {
    const qMenu = query(collection(db, 'menuItems'));
    const unsubscribeMenu = onSnapshot(qMenu, (snapshot) => {
      if (!snapshot.empty) {
        const itemsData: MenuItem[] = [];
        snapshot.forEach((doc) => {
          itemsData.push({ id: doc.id, ...doc.data() } as MenuItem);
        });
        setMenuItems(itemsData);
      } else {
        // Fallback to constants if Firestore is empty
        setMenuItems(MENU_ITEMS as MenuItem[]);
      }
    }, (error) => {
      console.error("Error fetching menu items:", error);
      setMenuItems(MENU_ITEMS as MenuItem[]);
    });

    const qCategories = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      if (!snapshot.empty) {
        const catsData: Category[] = [];
        snapshot.forEach((doc) => {
          catsData.push({ id: doc.id, ...doc.data() } as Category);
        });
        setCategories(catsData);
        if (!activeCategory && catsData.length > 0) {
          setActiveCategory(catsData[0].id);
        }
      } else {
        setCategories(MENU_CATEGORIES);
        if (!activeCategory) {
          setActiveCategory(MENU_CATEGORIES[0].id);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      setCategories(MENU_CATEGORIES);
      if (!activeCategory) {
        setActiveCategory(MENU_CATEGORIES[0].id);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeMenu();
      unsubscribeCategories();
    };
  }, [activeCategory]);

  const filteredItems = menuItems.filter((item) => item.categoryId === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 mb-20 md:mb-0">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 neon-text">المنيو</h1>
        <div className="w-24 h-1 bg-gradient-to-r from-yellow-500 to-yellow-700 mx-auto rounded-full"></div>
      </div>

      {/* Categories */}
      <div className="grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto pb-6 mb-8 scrollbar-hide snap-x auto-cols-max">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`relative flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden group transition-all snap-start ${
              activeCategory === category.id
                ? 'ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] scale-105'
                : 'ring-1 ring-white/10 hover:ring-white/30 opacity-80 hover:opacity-100'
            }`}
          >
            {category.imageUrl ? (
              <img 
                src={category.imageUrl} 
                alt={category.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                <ImageIcon className="text-slate-600" size={32} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-center p-3">
              <span className={`font-bold text-sm sm:text-base text-center transition-colors ${
                activeCategory === category.id ? 'text-yellow-500' : 'text-white'
              }`}>
                {category.name}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} onAdd={addItem} />
            ))}
          </AnimatePresence>
          
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500">
              لا توجد منتجات في هذا القسم حالياً
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd: any; key?: React.Key }) {
  const [selectedSize, setSelectedSize] = useState(item.sizes ? item.sizes[0] : null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const currentPrice = selectedSize ? selectedSize.price : item.price;

  const handleAdd = () => {
    onAdd({
      menuItemId: item.id,
      name: item.name,
      price: currentPrice,
      quantity,
      size: selectedSize?.name,
      notes,
    });
    setQuantity(1);
    setNotes('');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-panel rounded-2xl overflow-hidden border border-white/5 hover:border-yellow-500/30 transition-colors group flex flex-col h-full"
    >
      <div className="h-48 bg-black/50 relative overflow-hidden">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <ImageIcon size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
      </div>

      <div className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white">{item.name}</h3>
          <span className="text-lg font-bold text-yellow-500" dir="ltr">{currentPrice} ج.م</span>
        </div>

        {item.description && <p className="text-slate-400 text-sm mb-4 flex-grow">{item.description}</p>}

        {item.sizes && (
          <div className="flex gap-2 mb-4">
            {item.sizes.map((size: any) => (
              <button
                key={size.name}
                onClick={() => setSelectedSize(size)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedSize?.name === size.name
                    ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
                }`}
              >
                {size.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-white/5">
          <input
            type="text"
            placeholder="ملاحظات (اختياري)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm mb-4 text-white focus:outline-none focus:border-yellow-500 transition-colors placeholder-slate-500"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-black/30 rounded-lg p-1 border border-white/5">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-1 rounded-md bg-white/5 text-slate-400 hover:text-yellow-500 hover:bg-white/10 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold w-4 text-center text-white">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-1 rounded-md bg-white/5 text-slate-400 hover:text-yellow-500 hover:bg-white/10 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={handleAdd}
              className="flex items-center gap-2 neon-button px-4 py-2 rounded-lg font-bold text-sm"
            >
              <Receipt size={18} />
              إضافة للريسيت
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
