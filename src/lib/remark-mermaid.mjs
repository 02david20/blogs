import { visit } from "unist-util-visit";

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Turns ```mermaid fences into `<div class="mermaid">` at build time.
 *
 * This runs at the *remark* stage, before astro-expressive-code touches
 * code blocks, so diagrams never get syntax-highlighted as if they were
 * source. The page-level script then renders only the diagrams present,
 * loading mermaid lazily.
 */
export function remarkMermaid() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid" || !parent || index === null) return;
      parent.children[index] = {
        type: "html",
        value: `<div class="mermaid" data-mermaid-source="${escapeHtml(
          node.value,
        )}"></div>`,
      };
    });
  };
}
