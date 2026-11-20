import React, { useState, useMemo } from 'react';
import { Order } from '../../types';
import { Calendar, Filter, DollarSign, ShoppingBag, UtensilsCrossed, Truck, Download, Printer } from 'lucide-react';

interface AccountsReportProps {
  orders: Order[];
}

export default function AccountsReport({ orders }: AccountsReportProps) {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'delivery' | 'takeaway' | 'dine_in'>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');

  // Get unique drivers
  const drivers = useMemo(() => {
    const uniqueDrivers = new Set<string>();
    orders.forEach(order => {
      if (order.driverName) {
        uniqueDrivers.add(order.driverName);
      }
    });
    return Array.from(uniqueDrivers);
  }, [orders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Filter by Date
      let matchesDate = true;
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateRange === 'today') {
        matchesDate = orderDate >= today;
      } else if (dateRange === 'week') {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        matchesDate = orderDate >= lastWeek;
      } else if (dateRange === 'month') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        matchesDate = orderDate >= lastMonth;
      } else if (dateRange === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = orderDate >= start && orderDate <= end;
      }

      // 2. Filter by Order Type
      const matchesType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter || (!order.orderType && orderTypeFilter === 'delivery');

      // 3. Filter by Driver
      const matchesDriver = driverFilter === 'all' || order.driverName === driverFilter;

      // 4. Only include completed or delivered orders for revenue (or all non-cancelled? Let's say all non-cancelled for now, or just delivered/paid)
      const isNotCancelled = order.status !== 'cancelled';

      return matchesDate && matchesType && matchesDriver && isNotCancelled;
    });
  }, [orders, dateRange, startDate, endDate, orderTypeFilter, driverFilter]);

  // Calculate Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let deliveryCount = 0;
    let takeawayCount = 0;
    let dineInCount = 0;
    let cashTotal = 0;
    let onlineTotal = 0;
    let pendingTotal = 0;

    filteredOrders.forEach(order => {
      totalRevenue += order.totalAmount;
      
      const type = order.orderType || 'delivery';
      if (type === 'delivery') deliveryCount++;
      else if (type === 'takeaway') takeawayCount++;
      else if (type === 'dine_in') dineInCount++;

      if (order.paymentStatus === 'pending' || order.paymentStatus === 'awaiting_confirmation') {
        pendingTotal += order.totalAmount;
      } else {
        if (order.paymentMethod === 'cash') cashTotal += order.totalAmount;
        else onlineTotal += order.totalAmount;
      }
    });

    return {
      totalRevenue,
      totalOrders: filteredOrders.length,
      deliveryCount,
      takeawayCount,
      dineInCount,
      cashTotal,
      onlineTotal,
      pendingTotal
    };
  }, [filteredOrders]);

  const exportToCSV = () => {
    // Implementation for CSV export
    const headers = ['رقم الطلب', 'التاريخ', 'النوع', 'العميل', 'المندوب', 'طريقة الدفع', 'الإجمالي'];
    const rows = filteredOrders.map(order => [
      order.orderNumber || order.id.slice(-6).toUpperCase(),
      new Date(order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt).toLocaleDateString('ar-EG'),
      order.orderType === 'dine_in' ? 'صالة' : order.orderType === 'takeaway' ? 'تيك أواي' : 'توصيل',
      order.customerName || 'عميل',
      order.driverName || '---',
      order.paymentMethod === 'cash' ? 'كاش' : 'دفع إلكتروني',
      order.totalAmount
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_مبيعات_${new Date().toLocaleDateString('ar-EG')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="text-emerald-400" size={24} />
          <h2 className="text-xl font-bold text-white">تصفية التقارير</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400">الفترة الزمنية</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="today">اليوم</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر 30 يوم</option>
              <option value="custom">تخصيص...</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="space-y-2 lg:col-span-2 flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm text-slate-400">من</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-slate-400">إلى</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Order Type Filter */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400">نوع الطلب</label>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">الكل</option>
              <option value="delivery">توصيل</option>
              <option value="takeaway">تيك أواي</option>
              <option value="dine_in">صالة</option>
            </select>
          </div>

          {/* Driver Filter */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400">المندوب</label>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">كل المناديب</option>
              {drivers.map(driver => (
                <option key={driver} value={driver}>{driver}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-white">{stats.totalRevenue} ج.م</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">إجمالي الطلبات</p>
            <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">طلبات التوصيل</p>
            <p className="text-2xl font-bold text-white">{stats.deliveryCount}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
            <UtensilsCrossed size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">صالة / تيك أواي</p>
            <p className="text-2xl font-bold text-white">{stats.dineInCount + stats.takeawayCount}</p>
          </div>
        </div>
      </div>

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .shift-report, .shift-report * {
              visibility: visible;
            }
            .shift-report {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              color: black !important;
              background: white !important;
            }
            .shift-report .glass-panel {
              border: none !important;
              background: none !important;
            }
            .shift-report * {
              color: black !important;
            }
            .hide-on-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Detailed Breakdown & Shift Closing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 shift-report">
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">مطعم حرب</h2>
            <p className="text-lg">تقرير الوردية</p>
            <p className="text-sm mt-2">
              الفترة: {startDate} إلى {endDate}
            </p>
            <p className="text-sm">
              تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')} {new Date().toLocaleTimeString('ar-EG')}
            </p>
          </div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 hide-on-print">
            <Calendar className="text-emerald-400 hide-on-print" size={20} /> تقرير الوردية (تفصيل الطلبات)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <Truck className="text-purple-400" size={20} />
                <div>
                  <span className="text-white font-bold block">توصيل (Delivery)</span>
                  <span className="text-slate-400 text-sm">{stats.deliveryCount} طلب</span>
                </div>
              </div>
              <span className="font-bold text-emerald-400 text-lg">
                {filteredOrders.filter(o => (o.orderType === 'delivery' || !o.orderType)).reduce((sum, o) => sum + o.totalAmount, 0)} ج.م
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-blue-400" size={20} />
                <div>
                  <span className="text-white font-bold block">تيك أواي (Takeaway)</span>
                  <span className="text-slate-400 text-sm">{stats.takeawayCount} طلب</span>
                </div>
              </div>
              <span className="font-bold text-emerald-400 text-lg">
                {filteredOrders.filter(o => o.orderType === 'takeaway').reduce((sum, o) => sum + o.totalAmount, 0)} ج.م
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="text-orange-400" size={20} />
                <div>
                  <span className="text-white font-bold block">صالة (Dine-in)</span>
                  <span className="text-slate-400 text-sm">{stats.dineInCount} طلب</span>
                </div>
              </div>
              <span className="font-bold text-emerald-400 text-lg">
                {filteredOrders.filter(o => o.orderType === 'dine_in').reduce((sum, o) => sum + o.totalAmount, 0)} ج.م
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-slate-300 font-bold">الإجمالي الكلي</span>
              <span className="font-black text-white text-xl">{stats.totalRevenue} ج.م</span>
            </div>
            
            <button 
              onClick={() => {
                window.print();
              }}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2 font-bold hide-on-print"
            >
              <Printer size={20} /> طباعة تقرير الوردية
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4">تفاصيل طرق الدفع</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-slate-300">كاش (عند الاستلام)</span>
                <span className="font-bold text-emerald-400">{stats.cashTotal} ج.م</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-slate-300">دفع إلكتروني</span>
                <span className="font-bold text-blue-400">{stats.onlineTotal} ج.م</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-yellow-500/20">
                <span className="text-yellow-500">غير مدفوع (آجل)</span>
                <span className="font-bold text-yellow-500">{stats.pendingTotal} ج.م</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center">
            <Download size={48} className="text-slate-500 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">تصدير التقرير</h3>
            <p className="text-slate-400 text-sm mb-6">يمكنك تحميل نسخة من هذا التقرير بصيغة CSV لفتحه في Excel</p>
            <button 
              onClick={exportToCSV}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              <Download size={18} /> تحميل التقرير
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
