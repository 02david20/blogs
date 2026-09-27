import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";

/**
 * Appends a permalink anchor to h2–h4.
 *
 * Written locally rather than using rehype-autolink-headings, which silently
 * added nothing inside Astro's pipeline despite working standalone. Must run
 * after `rehypeHeadingIds`, since it links to the generated id.
 */
export function rehypeHeadingAnchors() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (!/^h[2-4]$/.test(node.tagName)) return;

      const id = node.properties?.id;
      if (!id) return;

      // Read the text before appending, so the "#" is not part of the label.
      const label = toString(node);

      node.children.push({
        type: "element",
        tagName: "a",
        properties: {
          className: ["heading-anchor"],
          href: `#${id}`,
          ariaLabel: `Permalink to “${label}”`,
        },
        children: [{ type: "text", value: "#" }],
      });
    });
  };
}
