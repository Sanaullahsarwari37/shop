const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  const hasBody = options?.body != null && options.body !== "";

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };

  // Only send JSON content-type when there is a body (fixes Fastify DELETE empty-body error)
  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    method,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  // Some DELETE endpoints return empty body
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  getDashboard: (date?: string) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return request<any>(`/dashboard${q}`);
  },

  getProducts: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<any[]>(`/products${q}`);
  },
  getProduct: (id: number) => request<any>(`/products/${id}`),
  createProduct: (data: any) =>
    request<any>("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) =>
    request<any>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: number) =>
    request<any>(`/products/${id}`, { method: "DELETE" }),

  getCategories: () => request<any[]>("/categories"),
  createCategory: (data: any) =>
    request<any>("/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: number, data: any) =>
    request<any>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: number) =>
    request<any>(`/categories/${id}`, { method: "DELETE" }),

  getSales: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<any[]>(`/sales${q}`);
  },
  createSale: (data: any) =>
    request<any>("/sales", { method: "POST", body: JSON.stringify(data) }),
  getSale: (id: number) => request<any>(`/sales/${id}`),

  getPurchases: () => request<any[]>("/purchases"),
  createPurchase: (data: any) =>
    request<any>("/purchases", { method: "POST", body: JSON.stringify(data) }),
  getPurchase: (id: number) => request<any>(`/purchases/${id}`),

  getCustomers: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<any[]>(`/customers${q}`);
  },
  getCustomer: (id: number) => request<any>(`/customers/${id}`),
  createCustomer: (data: any) =>
    request<any>("/customers", { method: "POST", body: JSON.stringify(data) }),
  updateCustomer: (id: number, data: any) =>
    request<any>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCustomer: (id: number) =>
    request<any>(`/customers/${id}`, { method: "DELETE" }),
  recordLoan: (id: number, data: any) =>
    request<any>(`/customers/${id}/loans`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  recordPayment: (id: number, data: any) =>
    request<any>(`/customers/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getReport: (params: Record<string, string>) => {
    const q = "?" + new URLSearchParams(params).toString();
    return request<any>(`/reports${q}`);
  },
};

export function formatMoney(value: string | number, symbol = "؋") {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return `${symbol} 0.00`;
  return `${symbol} ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
