import { todayISO } from "./i18n";

const IN_APP_BROWSER_REGEX = /MicroMessenger|FB_IAB|FBAN|FBAV|Instagram/i;

function isInAppBrowser(): boolean {
  return IN_APP_BROWSER_REGEX.test(navigator.userAgent);
}

async function loadHtml2Pdf(): Promise<((opts: unknown) => unknown) | null> {
  const w = window as unknown as { html2pdf?: unknown };
  if (w.html2pdf) return w.html2pdf as (opts: unknown) => unknown;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const win = window as unknown as { html2pdf?: unknown };
      resolve((win.html2pdf as (opts: unknown) => unknown) ?? null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

export async function downloadPdf(): Promise<void> {
  const filename = `csc-career-compass-results-${todayISO()}.pdf`;
  if (!isInAppBrowser()) {
    // Tier 1: native print dialog with "Save as PDF"
    window.print();
    return;
  }
  // Tier 2: in-app browser — use html2pdf.js
  const lib = await loadHtml2Pdf();
  const target = document.querySelector(".results") as HTMLElement | null;
  if (!lib || !target) {
    window.print(); // last-resort fallback
    return;
  }
  // Best-effort: html2pdf chains via .from().set().save()
  const options = {
    margin: 10,
    filename,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
    pagebreak: { mode: ["css", "avoid-all"] },
  };
  type Chain = { from: (el: HTMLElement) => Chain; set: (o: unknown) => Chain; save: () => Promise<void> };
  const chain = (lib as unknown as () => Chain)();
  try {
    await chain.from(target).set(options).save();
  } catch {
    window.print();
  }
}
