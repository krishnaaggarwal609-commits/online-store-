export type User = {
  id: string;
  email: string;
  role: "CUSTOMER" | "ADMIN" | string;
  status?: string;
  fullName?: string | null;
  mobile?: string | null;
};

export type Media = {
  id: string;
  mediaType: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
};

export type Variant = {
  id: string;
  sku: string;
  variantName: string;
  price: number;
  stockQuantity: number;
  available: number;
  attributes: Record<string, string>;
  status: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  featured: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  specifications: Record<string, string>;
  tags: string[];
  inStock: boolean;
  image: string;
  category: { id: string; name: string; slug: string };
  variants: Variant[];
  media: Media[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  productCount?: number;
  status?: string;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  variantName: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
  available: number;
  image: string;
};

export type Cart = {
  id: string;
  items: CartItem[];
  count: number;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
};

export type Address = {
  id?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault?: boolean;
};

export type Order = {
  id: string;
  orderNumber: string;
  email: string;
  mobile: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string | null;
  shippingAddress: Address;
  createdAt: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  items: {
    id: string;
    name: string;
    variantName: string;
    sku: string;
    price: number;
    quantity: number;
    total: number;
    slug: string;
    image: string;
  }[];
  history?: { toStatus: string; note?: string | null; createdAt: string }[];
};
