export const MENU_CATEGORIES = [
  { id: 'sandwiches', name: 'سندوتشات', imageUrl: 'https://images.unsplash.com/photo-1619881589316-56c7f9e6b587?auto=format&fit=crop&q=80&w=400', order: 0 },
  { id: 'grills', name: 'المشاوي', imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400', order: 1 },
  { id: 'harb_cannon', name: 'مدفع حرب', imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=400', order: 2 },
  { id: 'shawarma', name: 'شاورما', imageUrl: 'https://images.unsplash.com/photo-1646615077267-97c6088b74d9?auto=format&fit=crop&q=80&w=400', order: 3 },
  { id: 'burger', name: 'برجر', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400', order: 4 },
  { id: 'crispy', name: 'سندوتشات كرسبي', imageUrl: 'https://images.unsplash.com/photo-1615486171448-4ff285a214d9?auto=format&fit=crop&q=80&w=400', order: 5 },
  { id: 'meals', name: 'وجبات', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400', order: 6 },
  { id: 'drinks', name: 'المشروبات', imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&q=80&w=400', order: 7 },
  { id: 'addons', name: 'اضافات', imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&q=80&w=400', order: 8 },
];

export const MENU_ITEMS = [
  // Sandwiches
  { id: 's1', categoryId: 'sandwiches', name: 'شاورما لحم', price: 100, sizes: [{ name: 'كبير', price: 100 }, { name: 'صغير', price: 40 }] },
  { id: 's2', categoryId: 'sandwiches', name: 'شاورما فراخ', price: 70, sizes: [{ name: 'كبير', price: 70 }, { name: 'صغير', price: 40 }] },
  { id: 's3', categoryId: 'sandwiches', name: 'بطاطس صاج سوري', price: 25, sizes: [{ name: 'كبير', price: 25 }, { name: 'صغير', price: 15 }] },
  { id: 's4', categoryId: 'sandwiches', name: 'فلافل صاج سوري', price: 25, sizes: [{ name: 'كبير', price: 25 }, { name: 'صغير', price: 15 }] },
  { id: 's5', categoryId: 'sandwiches', name: 'س كفتة لحم على الطريقة التركية', price: 100 },
  { id: 's6', categoryId: 'sandwiches', name: 'س كفتة دجاج على الطريقة التركية', price: 50 },
  { id: 's7', categoryId: 'sandwiches', name: 'س استيك اللحم المشوي', price: 100 },
  { id: 's8', categoryId: 'sandwiches', name: 'شيش طاووق', price: 50 },
  { id: 's9', categoryId: 'sandwiches', name: 'حواوشي اللحم البلدي', price: 100 },
  { id: 's10', categoryId: 'sandwiches', name: 'حواوشي الدجاج المميز', price: 50 },

  // Grills
  { id: 'g1', categoryId: 'grills', name: 'كفتة بلدي', price: 700, sizes: [{ name: '1 ك', price: 700 }, { name: '1/2', price: 400 }, { name: '1/4', price: 220 }] },
  { id: 'g2', categoryId: 'grills', name: 'كفتة دجاج', price: 350, sizes: [{ name: '1 ك', price: 350 }, { name: '1/2', price: 200 }, { name: '1/4', price: 110 }] },
  { id: 'g3', categoryId: 'grills', name: 'ريش', price: 1000, sizes: [{ name: '1 ك', price: 1000 }, { name: '1/2', price: 550 }, { name: '1/4', price: 300 }] },
  { id: 'g4', categoryId: 'grills', name: 'كباب لحم', price: 900, sizes: [{ name: '1 ك', price: 900 }, { name: '1/2', price: 500 }, { name: '1/4', price: 300 }] },
  { id: 'g5', categoryId: 'grills', name: 'طرب ضاني', price: 800, sizes: [{ name: '1 ك', price: 800 }, { name: '1/2', price: 450 }, { name: '1/4', price: 250 }] },
  { id: 'g6', categoryId: 'grills', name: 'استيك لحم مشوي', price: 900, sizes: [{ name: '1 ك', price: 900 }, { name: '1/2', price: 500 }, { name: '1/4', price: 300 }] },
  { id: 'g7', categoryId: 'grills', name: 'شيش طاووق', price: 350, sizes: [{ name: '1 ك', price: 350 }, { name: '1/2', price: 175 }, { name: '1/4', price: 110 }] },
  { id: 'g8', categoryId: 'grills', name: 'فرخة شيش فحم', price: 300, sizes: [{ name: '1 ك', price: 300 }, { name: '1/2', price: 160 }, { name: '1/4', price: 90 }] },
  { id: 'g9', categoryId: 'grills', name: 'فرخة تكه فحم', price: 320, sizes: [{ name: '1 ك', price: 320 }, { name: '1/2', price: 320 }, { name: '1/4', price: 100 }] },

  // Harb Cannon (Fried Chicken)
  { id: 'hc1', categoryId: 'harb_cannon', name: '12 قطعة فرايد تشيكن', price: 650, description: '2 ارز + 6 خبز + 4 كولسلو + 4 مشروب + صوص + مخلل' },
  { id: 'hc2', categoryId: 'harb_cannon', name: '8 قطع فرايد تشيكن', price: 450, description: '2 ارز + 4 خبز + 4 كولسلو + 2 مشروب + صوص + مخلل' },
  { id: 'hc3', categoryId: 'harb_cannon', name: '4 قطع فرايد تشيكن', price: 250, description: 'ارز + 2 خبز + 2 كولسلو + مشروب + صوص + مخلل' },
  { id: 'hc4', categoryId: 'harb_cannon', name: '2 قطع صدر فرايد تشيكن', price: 150, description: 'ارز + خبز + كولسلو + مشروب + صوص + مخلل' },
  { id: 'hc5', categoryId: 'harb_cannon', name: '2 قطعة فرايد تشيكن ورك', price: 100, description: 'ارز + خبز + كولسلو + صوص + مخلل' },
  { id: 'hc6', categoryId: 'harb_cannon', name: 'وجبة زنجر دجاج', price: 210, description: '5 قطع زنجر مقرمش + بطاطس + صوص شيدر + مايونيز + كوليسلو + خبز' },
  { id: 'hc7', categoryId: 'harb_cannon', name: 'وجبة تشيكن بيكاتا', price: 230, description: 'شرائح الدجاج المشوية مع الصوص المميز و الارز و البطاطس' },

  // Shawarma
  { id: 'sh1', categoryId: 'shawarma', name: 'شاورما دجاج', price: 350, sizes: [{ name: '1/2', price: 350 }, { name: '1/4', price: 200 }] },
  { id: 'sh2', categoryId: 'shawarma', name: 'شاورما لحم', price: 500, sizes: [{ name: '1/2', price: 500 }, { name: '1/4', price: 300 }] },

  // Burger
  { id: 'b1', categoryId: 'burger', name: 'تشيز برجر L', price: 75, description: 'شريحة لحم 100 جرام + خس + صوص حرب + شريحة جبن' },
  { id: 'b2', categoryId: 'burger', name: 'تشيز برجر XL', price: 100, description: 'شريحة لحم 150 جرام + خس + صوص حرب + شريحة جبن' },
  { id: 'b3', categoryId: 'burger', name: 'تشيز برجر دبل جوسي', price: 170, description: '2 شريحة لحم 150 جرام + خس + صوص حرب + شريحة جبن + حلقات البصل الفرش + طماطم + خيار مخلل' },

  // Crispy Sandwiches
  { id: 'cr1', categoryId: 'crispy', name: 'زنجر الرشاش', price: 160, description: '2 قطعة زنجر + خس + طماطم + خيار مخلل + جبنة شرايح + لحم الرومي المدخن' },
  { id: 'cr2', categoryId: 'crispy', name: 'كرسبي المدفع', price: 105, description: 'استربس الدجاج + صوص + كولسلو + رانش + صوص حرب المميز' },
  { id: 'cr3', categoryId: 'crispy', name: 'زنجر دجاج', price: 80, description: 'قطعة زنجر + خس + طماطم + شرائح جبنة + خيار مخلل + صوص حرب' },

  // Meals
  { id: 'm1', categoryId: 'meals', name: 'وجبة شاورما عربي دجاج', price: 110 },
  { id: 'm2', categoryId: 'meals', name: 'وجبة شاورما عربي لحم', price: 150 },
  { id: 'm3', categoryId: 'meals', name: 'وجبة ماريا لحم', price: 150 },
  { id: 'm4', categoryId: 'meals', name: 'وجبة ماريا دجاج', price: 110 },
  { id: 'm5', categoryId: 'meals', name: 'فتة شاورما دجاج', price: 120, sizes: [{ name: 'كبير', price: 120 }, { name: 'صغير', price: 90 }] },
  { id: 'm6', categoryId: 'meals', name: 'فتة شاورما لحم', price: 140, sizes: [{ name: 'كبير', price: 140 }, { name: 'صغير', price: 110 }] },

  // Drinks
  { id: 'd1', categoryId: 'drinks', name: 'ليمون نعناع', price: 20 },
  { id: 'd2', categoryId: 'drinks', name: 'ليمون', price: 15 },
  { id: 'd3', categoryId: 'drinks', name: 'برتقال فريش', price: 20 },
  { id: 'd4', categoryId: 'drinks', name: 'فراولة', price: 30 },
  { id: 'd5', categoryId: 'drinks', name: 'مانجا', price: 35 },
  { id: 'd6', categoryId: 'drinks', name: 'جوافة', price: 25 },

  // Addons
  { id: 'a1', categoryId: 'addons', name: 'باكت بطاطس', price: 20, sizes: [{ name: 'كبير', price: 20 }, { name: 'صغير', price: 10 }] },
  { id: 'a2', categoryId: 'addons', name: 'علبة تومية', price: 10 },
  { id: 'a3', categoryId: 'addons', name: 'علبة كولوسلو', price: 10 },
  { id: 'a4', categoryId: 'addons', name: 'سلطة خضراء', price: 30 },
  { id: 'a5', categoryId: 'addons', name: 'سلطة فتوش', price: 20 },
  { id: 'a6', categoryId: 'addons', name: 'اكسترا جبنة', price: 10 },
  { id: 'a7', categoryId: 'addons', name: 'سلطة جرجير', price: 10 },
  { id: 'a8', categoryId: 'addons', name: 'مشروب غازي', price: 10 },
  { id: 'a9', categoryId: 'addons', name: 'زجاجة مياه', price: 5 },
];

export const PAYMENT_METHODS = [
  { id: 'cash', name: 'كاش عند الاستلام' },
  { id: 'vodafone_cash', name: 'فودافون كاش', ussd: '*9*7*01000315777**Amount*#' },
  { id: 'orange_cash', name: 'اورانج كاش', ussd: '#7115*01200000000**Amount*#' },
  { id: 'etisalat_cash', name: 'اتصالات كاش', ussd: '*777*1*01100000000**Amount*#' },
  { id: 'we_pay', name: 'وي باي', ussd: '*322*1*01500000000**Amount*#' },
  { id: 'instapay', name: 'انستا باي', address: 'harb@instapay' },
];

export const RESTAURANT_PHONE = '01000315777';
export const RESTAURANT_ADDRESS = 'العنوان موقف البراجيل بجوار البنك الزراعى - البراجيل - الجيزة';
