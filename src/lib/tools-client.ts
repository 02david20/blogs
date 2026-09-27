/**
 * Shared browser-side helpers for tool pages. Imported from each tool's
 * inline <script type="module">, never bundled into a page that doesn't use
 * it (Astro tree-shakes per-page script bundles).
 */

/** Escapes text before it is injected as HTML (e.g. regex match highlighting). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Writes text to the clipboard and flips the trigger button's label to a
 * confirmation for a moment. Falls back to a manual copy hint if the
 * Clipboard API is unavailable (older browsers, insecure context).
 */
export async function copyToClipboard(text: string, button: HTMLButtonElement): Promise<void> {
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied!";
  } catch {
    button.textContent = "Copy failed";
  }
  button.disabled = true;
  window.setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1500);
}

/** Triggers a browser download of generated content — no server round-trip. */
export function download(filename: string, content: string, mime = "text/plain"): void {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

/** Renders a message into a `.tool-error` element, or clears it when null. */
export function setError(el: HTMLElement | null, message: string | null): void {
  if (!el) return;
  el.textContent = message ?? "";
  el.hidden = !message;
}
