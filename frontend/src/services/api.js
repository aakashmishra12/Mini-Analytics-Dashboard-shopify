const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, { signal, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { signal, ...options });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the API. Is the backend running?', 'NETWORK_ERROR', 0);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.error?.message || `Request failed (HTTP ${response.status})`,
      body?.error?.code || 'HTTP_ERROR',
      response.status
    );
  }

  return response.json();
}

const query = (params) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  ).toString();
  return search ? `?${search}` : '';
};

export const api = {
  getDashboard: (opts) => request('/dashboard', opts),
  getOrders: ({ search = '', page = 1, limit = 10 }, opts) =>
    request(`/orders${query({ search, page, limit })}`, opts),
  getProducts: ({ search = '', page = 1, limit = 10 }, opts) =>
    request(`/products${query({ search, page, limit })}`, opts),
  getTopSelling: (opts) => request('/products/top-selling', opts),
  getInventory: ({ search = '', page = 1, limit = 10 }, opts) =>
    request(`/inventory${query({ search, page, limit })}`, opts),
  refresh: (opts) => request('/refresh', { method: 'POST', ...opts }),
  ordersExportUrl: (search) => `${BASE_URL}/orders/export${query({ search })}`,
};
