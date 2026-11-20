export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  order?: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  sizes?: { name: string; price: number }[];
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  notes?: string;
}

export interface Order {
  id: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentMethod: string;
  paymentStatus?: 'pending' | 'paid' | 'awaiting_confirmation';
  orderType?: 'delivery' | 'takeaway' | 'dine_in';
  tableNumber?: string;
  cashierId?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  createdAt: any;
  updatedAt?: any;
  orderNumber?: number;
  driverName?: string;
  driverPhone?: string;
  paymentProofUrl?: string;
}
