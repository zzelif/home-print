import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface PrintJob {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  source: 'QR_DROP' | 'MANUAL_UI' | 'MESSENGER' | 'GMAIL' | 'USB_SANDBOX' | 'TELEGRAM';
  product_id?: string;
  status: 'UPLOADED' | 'IN_LAYOUT' | 'READY_TO_PRINT' | 'PRINTING' | 'COMPLETED' | 'CANCELLED';
  copies: number;
  layout_preset?: string;
  selling_price: number;
  final_amount: number;
  payment_status: 'PENDING' | 'PAID';
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
  }>;
}

export const useJobStore = defineStore('jobStore', () => {
  const jobs = ref<PrintJob[]>([]);
  const activeJob = ref<PrintJob | null>(null);
  const isConnected = ref(false);
  const printerStatus = ref({ isOnline: true, state: 'idle', message: 'Printer Ready' });

  let ws: WebSocket | null = null;

  async function fetchJobs() {
    try {
      const res = await fetch('/api/operator/jobs');
      if (res.ok) {
        const data = await res.json();
        jobs.value = data.jobs;
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  }

  function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/operator`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isConnected.value = true;
      ws?.send(JSON.stringify({ type: 'SYNC_REQUEST' }));
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
      // Reconnect after 3s
      setTimeout(initWebSocket, 3000);
    };
  }

  async function updateJobStatus(jobId: string, status: PrintJob['status']) {
    await fetch(`/api/operator/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchJobs();
  }

  async function completeCheckout(jobId: string, cashTendered: number, changeGiven: number) {
    const res = await fetch(`/api/operator/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashTendered, changeGiven, paymentMethod: 'CASH' }),
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
    initWebSocket,
    updateJobStatus,
    completeCheckout,
  };
});
