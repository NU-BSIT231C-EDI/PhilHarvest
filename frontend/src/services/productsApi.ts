const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', Accept: 'application/json' };
}

export interface ApiProduct {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: string;
  unit_of_measure: string;
  stock_quantity: number;
  reorder_point: number;
  seller_name: string | null;
  weight_kg: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiProductPage {
  data: ApiProduct[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ProductPayload {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit_price: number;
  unit_of_measure?: string;
  stock_quantity?: number;
  reorder_point?: number;
  seller_name?: string;
  weight_kg?: number;
  image_url?: string;
  is_active?: boolean;
}

export async function fetchProducts(params?: {
  search?: string;
  category?: string;
  active?: boolean;
  per_page?: number;
  page?: number;
}): Promise<ApiProductPage> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.category && params.category !== 'all') qs.set('category', params.category);
  if (params?.active !== undefined) qs.set('active', String(params.active));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  if (params?.page) qs.set('page', String(params.page));

  const res = await fetch(`${API_URL}/api/products?${qs}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);
  return res.json();
}

export async function createProduct(payload: ProductPayload): Promise<ApiProduct> {
  const res = await fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Failed to create product (${res.status})`);
  return data;
}

export async function updateProduct(id: number, payload: Partial<ProductPayload>): Promise<ApiProduct> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `Failed to update product (${res.status})`);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Failed to delete product (${res.status})`);
}
