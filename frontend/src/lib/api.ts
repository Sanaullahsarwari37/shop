const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  const hasBody = options?.body != null && options.body !== "";

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };

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

  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  getDashboard: (date?: string, period?: string) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (period) params.set("period", period);
    const q = params.toString() ? `?${params}` : "";
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
  deleteProductsBulk: async (ids: number[]) => {
    const results: { id: number; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await request<any>(`/products/${id}`, { method: "DELETE" });
        results.push({ id, ok: true });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message || "Failed" });
      }
    }
    return { results };
  },

  getCategories: () => request<any[]>("/categories"),
  createCategory: (data: any) =>
    request<any>("/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id: number, data: any) =>
    request<any>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: number, force = false) =>
    request<any>(`/categories/${id}${force ? "?force=true" : ""}`, {
      method: "DELETE",
    }),
  deleteCategoriesBulk: async (ids: number[], force = true) => {
    const results: { id: number; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await request<any>(`/categories/${id}${force ? "?force=true" : ""}`, {
          method: "DELETE",
        });
        results.push({ id, ok: true });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message || "Failed" });
      }
    }
    return { results };
  },

  getSales: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<any[]>(`/sales${q}`);
  },
  createSale: (data: any) =>
    request<any>("/sales", { method: "POST", body: JSON.stringify(data) }),
  getSale: (id: number) => request<any>(`/sales/${id}`),
  deleteSale: (id: number) =>
    request<any>(`/sales/${id}`, { method: "DELETE" }),
  deleteSalesBulk: (ids: number[]) =>
    request<any>("/sales/delete-bulk", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  getPurchases: () => request<any[]>("/purchases"),
  createPurchase: (data: any) =>
    request<any>("/purchases", { method: "POST", body: JSON.stringify(data) }),
  getPurchase: (id: number) => request<any>(`/purchases/${id}`),
  deletePurchase: (id: number) =>
    request<any>(`/purchases/${id}`, { method: "DELETE" }),
  deletePurchaseItem: (id: number) =>
    request<any>(`/purchase-items/${id}`, { method: "DELETE" }),
  deletePurchasesBulk: (ids: number[]) =>
    request<any>("/purchases/delete-bulk", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

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
  deleteCustomersBulk: async (ids: number[]) => {
    const results: { id: number; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await request<any>(`/customers/${id}`, { method: "DELETE" });
        results.push({ id, ok: true });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message || "Failed" });
      }
    }
    return { results };
  },
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

/** @deprecated Prefer useSettings().formatMoney — kept for gradual migration */
export function formatMoney(value: string | number, symbol = "؋") {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return `${symbol} 0.00`;
  return `${symbol} ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
