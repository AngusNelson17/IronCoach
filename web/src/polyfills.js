// The dashboard was written as a Claude artifact and uses window.storage
// for persistence. In a real browser there's no window.storage, so we
// shim it onto localStorage. Same shape: { get(key) -> {value} | null, set(key, val) }.
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (k) => {
      const v = localStorage.getItem(k)
      return v != null ? { value: v } : null
    },
    set: async (k, v) => {
      localStorage.setItem(k, v)
    },
  }
}
