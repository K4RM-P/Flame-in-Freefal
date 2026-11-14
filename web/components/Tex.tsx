// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import katex from "katex";

export function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { displayMode: block, throwOnError: false, output: "html" });
  return <span className={block ? "block overflow-x-auto py-1" : ""} dangerouslySetInnerHTML={{ __html: html }} />;
}
