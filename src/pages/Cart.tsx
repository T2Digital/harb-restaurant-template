import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../CartContext';
import { Trash2, Plus, Minus, ArrowRight, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Cart() {
  useDocumentTitle('مطعم حرب | الريسيت');
  const { items, removeItem, updateQuantity, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/30">
          <Receipt size={48} className="text-yellow-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">الريسيت فارغ</h2>
        <p className="text-slate-400 mb-8 text-lg">لم تقم بإضافة أي منتجات للريسيت بعد.</p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 neon-button px-8 py-4 rounded-xl font-bold transition-colors"
        >
          تصفح المنيو
          <ArrowRight size={20} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Receipt size={32} className="text-yellow-500" />
        <h1 className="text-4xl font-bold text-white">الريسيت</h1>
      </div>

      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <ul className="divide-y divide-white/10">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-white">{item.name}</h3>
                  {item.size && <p className="text-yellow-500 text-sm mt-1 bg-yellow-500/10 inline-block px-2 py-1 rounded-md border border-yellow-500/20">الحجم: {item.size}</p>}
                  {item.notes && <p className="text-slate-400 text-sm mt-2 bg-black/30 p-2 rounded-lg border border-white/5">ملاحظات: {item.notes}</p>}
                  <p className="text-yellow-500 font-bold mt-2" dir="ltr">{item.price} ج.م</p>
                </div>

                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-3 bg-black/30 rounded-lg p-1 border border-white/5">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 rounded-md bg-white/5 text-slate-400 hover:text-yellow-500 hover:bg-white/10 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-bold w-6 text-center text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 rounded-md bg-white/5 text-slate-400 hover:text-yellow-500 hover:bg-white/10 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="text-left min-w-[80px]">
                    <p className="font-bold text-white" dir="ltr">{item.price * item.quantity} ج.م</p>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <div className="bg-black/30 p-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-slate-400 mb-1">الإجمالي</p>
            <p className="text-3xl font-black neon-text" dir="ltr">{total} ج.م</p>
          </div>
          <Link
            to="/checkout"
            className="w-full sm:w-auto text-center neon-button px-8 py-4 rounded-xl font-bold transition-colors"
          >
            متابعة الدفع
          </Link>
        </div>
      </div>
    </div>
  );
}
