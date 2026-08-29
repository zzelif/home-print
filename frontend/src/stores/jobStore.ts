import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './authStore';

export interface PrintJob {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  source: 'QR_DROP' | 'MANUAL_UI' | 'MESSENGER' | 'GMAIL' | 'USB_SANDBOX' | 'TELEGRAM';
  product_id?: string;
  status: 'UPLOADED' | 'IN_LAYOUT' | 'READY_TO_PRINT' | 'PRINTING' | 'COMPLETED' | 'CANCELLED' | 'PURGED';
  copies: number;
  layout_preset?: string;
  selling_price: number;
  final_amount: number;
  payment_status: 'PENDING' | 'PAID' | 'UNPAID';
  cash_tendered?: number;
  change_given?: number;
  pdf_path?: string;
  created_at: string;
  files: Array<{
    id: string;
    originalName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
    isPurged?: number;
  }>;
}

export const useJobStore = defineStore('jobStore', () => {
  const jobs = ref<PrintJob[]>([]);
  const activeJob = ref<PrintJob | null>(null);
  const isConnected = ref(false);
  const printerStatus = ref<{
    isOnline: boolean;
    state: string;
    message: string;
    activePrinterName?: string;
  }>({
    isOnline: false,
    state: 'disconnected',
    message: 'Printer not connected / Offline',
    activePrinterName: '',
  });

  let ws: WebSocket | null = null;
  let pollingInterval: any = null;

  async function fetchJobs() {
    try {
      const res = await fetch('/api/operator/jobs', { credentials: 'include' });
      if (res.status === 401) {
        const authStore = useAuthStore();
        authStore.isAuthenticated = false;
        return;
      }
      if (res.ok) {
        const data = await res.json();
        jobs.value = data.jobs || [];
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  }

  async function fetchPrinterStatus() {
    try {
      const res = await fetch('/api/operator/print/status', { credentials: 'include' });
      if (res.status === 401) {
        const authStore = useAuthStore();
        authStore.isAuthenticated = false;
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          printerStatus.value = data.status;
        }
      }
    } catch {
      printerStatus.value = {
        isOnline: false,
        state: 'disconnected',
        message: 'Printer Service Unreachable',
      };
    }
  }

  function initWebSocket() {
    if (ws) {
      try {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      } catch {}
      ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/operator`;
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        isConnected.value = true;
        try {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SYNC_REQUEST' }));
          }
        } catch (err) {
          console.warn('WS sync send warning:', err);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_JOB_INGESTED' || data.type === 'JOB_STATE_CHANGED') {
            fetchJobs();
          } else if (data.type === 'CUPS_STATUS_UPDATE') {
            printerStatus.value = data.payload;
          }
        } catch (e) {
          // Ignore malformed WS payloads
        }
      };

      ws.onclose = () => {
        isConnected.value = false;
        setTimeout(() => {
          if (!isConnected.value) {
            initWebSocket();
          }
        }, 5000);
      };

      ws.onerror = () => {
        isConnected.value = false;
      };
    } catch (e) {
      isConnected.value = false;
    }

    // Polling fallback: jobs every 4s, printer status every 8s
    if (!pollingInterval) {
      let tickCount = 0;
      pollingInterval = setInterval(() => {
        fetchJobs();
        tickCount++;
        if (tickCount % 2 === 0) {
          fetchPrinterStatus();
        }
      }, 4000);
    }
  }

  async function updateJobStatus(jobId: string, status: PrintJob['status']) {
    await fetch(`/api/operator/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'include',
    });
    await fetchJobs();
  }

  async function cancelJob(jobId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/operator/jobs/${jobId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await fetchJobs();
        return true;
      }
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
    return false;
  }

  async function completeCheckout(jobId: string, cashTendered: number, changeGiven: number, purgeFiles: boolean = true) {
    const res = await fetch(`/api/operator/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashTendered, changeGiven, paymentMethod: 'CASH', purgeFiles }),
      credentials: 'include',
    });
    if (res.ok) {
      await fetchJobs();
    }
  }

  async function purgeJob(jobId: string) {
    const res = await fetch(`/api/operator/jobs/${jobId}/purge`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      await fetchJobs();
    }
  }

  async function purgeCompletedJobs() {
    const res = await fetch('/api/operator/jobs/purge-completed', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      await fetchJobs();
    }
  }

  return {
    jobs,
    activeJob,
    isConnected,
    printerStatus,
    fetchJobs,
    fetchPrinterStatus,
    initWebSocket,
    updateJobStatus,
    cancelJob,
    completeCheckout,
    purgeJob,
    purgeCompletedJobs,
  };
});
