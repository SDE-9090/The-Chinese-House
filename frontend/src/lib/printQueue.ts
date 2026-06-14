/**
 * Sequential Print Queue - Electron-based silent printing
 * Handles retries, deduplication, and queue state tracking
 */

import { buildReceiptCanvas, type ReceiptData } from "./receiptGenerator";

/* ─── Types ─── */
export interface PrintJob {
  id: string;            // unique key (e.g. order-id or order-id:paid)
  data: ReceiptData;
  retries: number;
}

type QueueListener = (state: {
  pending: number;
  current: string | null;
  failed: string[];
}) => void;

/* ─── Electron check ─── */
function isElectron(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as any).electronAPI !== "undefined"
  );
}

/* ─── Constants ─── */
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;      // delay before retry
const POST_PRINT_DELAY = 500;  // delay after success (avoid printer overload)

/* ─── Singleton Queue ─── */
class PrintQueue {
  private queue: PrintJob[] = [];
  private processing = false;
  private knownIds = new Set<string>();
  private failedIds: string[] = [];
  private currentJobId: string | null = null;
  private listeners = new Set<QueueListener>();

  /* ─── Subscribe to queue state ─── */
  subscribe(fn: QueueListener) {
    this.listeners.add(fn);
    fn(this.state);

    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    const snapshot = this.state;
    this.listeners.forEach((fn) => fn(snapshot));
  }

  /* ─── Public state ─── */
  get state() {
    return {
      pending: this.queue.length,
      current: this.currentJobId,
      failed: [...this.failedIds],
    };
  }

  /* ─── Add job to queue ─── */
  enqueue(id: string, data: ReceiptData) {
    if (!isElectron()) return;

    // prevent duplicates
    if (this.knownIds.has(id)) return;

    this.knownIds.add(id);
    this.queue.push({ id, data, retries: 0 });

    console.log("[PrintQueue] Enqueued:", id);

    this.notify();
    this.processNext();
  }

  /* ─── Retry failed jobs manually ─── */
  retryFailed() {
    const ids = [...this.failedIds];
    this.failedIds = [];

    for (const id of ids) {
      this.knownIds.delete(id); // allow re-enqueue
    }

    console.log("[PrintQueue] Retrying failed jobs:", ids);

    this.notify();
  }

  /* ─── Core processor ─── */
  private async processNext() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    const job = this.queue.shift()!;
    this.currentJobId = job.id;
    this.notify();

    console.log("[PrintQueue] Printing:", job.id);

    try {
      await this.executePrint(job);

      // success delay
      await delay(POST_PRINT_DELAY);
    } catch (err) {
      console.warn(
        `[PrintQueue] Failed ${job.id} (attempt ${job.retries + 1})`,
        err
      );

      job.retries += 1;

      if (job.retries < MAX_RETRIES) {
        // retry
        this.queue.unshift(job);
        await delay(RETRY_DELAY);
      } else {
        console.error(
          `[PrintQueue] Permanently failed: ${job.id}`
        );
        this.failedIds.push(job.id);
      }
    }

    this.currentJobId = null;
    this.processing = false;
    this.notify();

    // process next job
    this.processNext();
  }

  /* ─── Actual print execution (Electron) ─── */
  private async executePrint(job: PrintJob): Promise<void> {
    if (!(window as any).electronAPI) {
      console.warn("[PrintQueue] Not in Electron, skipping print");
      return;
    }

    const canvas = buildReceiptCanvas(job.data);
    const dataUrl = canvas.toDataURL("image/png");

    // 🔥 THIS is the key - call Electron
    await (window as any).electronAPI.printReceipt(dataUrl);
  }
}

/* ─── Helper delay ─── */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ─── Export singleton ─── */
export const printQueue = new PrintQueue();