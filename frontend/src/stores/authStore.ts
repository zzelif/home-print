import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('authStore', () => {
  const isAuthenticated = ref(false);
  const isLoading = ref(true);

  async function checkAuth() {
    isLoading.value = true;
    try {
      const res = await fetch('/api/operator/me');
      if (res.ok) {
        const data = await res.json();
        isAuthenticated.value = data.authenticated;
      }
    } catch {
      isAuthenticated.value = false;
    } finally {
      isLoading.value = false;
    }
  }

  async function login(pin: string): Promise<boolean> {
    try {
      const res = await fetch('/api/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        isAuthenticated.value = true;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function logout() {
    await fetch('/api/operator/logout', { method: 'POST' });
    isAuthenticated.value = false;
  }

  return {
    isAuthenticated,
    isLoading,
    checkAuth,
    login,
    logout,
  };
});
