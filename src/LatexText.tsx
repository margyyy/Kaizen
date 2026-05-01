import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexTextProps {
  text: string;
  className?: string;
}

export default function LatexText({ text, className }: LatexTextProps) {
  const renderLatex = (input: string) => {
    // Split by $$...$$ (block) first, then by $...$ (inline)
    const parts: { type: "text" | "block" | "inline"; content: string }[] = [];
    const blockRegex = /\$\$([\s\S]+?)\$\$/g;

    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(input)) !== null) {
      if (match.index > lastIdx) {
        const before = input.slice(lastIdx, match.index);
        parts.push(...splitInline(before));
      }
      parts.push({ type: "block", content: match[1] });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < input.length) {
      parts.push(...splitInline(input.slice(lastIdx)));
    }

    return parts.map((p, i) => {
      if (p.type === "text") {
        return <span key={i}>{p.content}</span>;
      }
      try {
        const html = katex.renderToString(p.content.trim(), {
          throwOnError: false,
          displayMode: p.type === "block",
        });
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return <span key={i} className="text-error">{p.content}</span>;
      }
    });
  };

  return <span className={className}>{renderLatex(text)}</span>;
}

function splitInline(input: string): { type: "text" | "inline"; content: string }[] {
  const parts: { type: "text" | "inline"; content: string }[] = [];
  const regex = /\$([^$]+?)\$/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: "text", content: input.slice(lastIdx, match.index) });
    }
    parts.push({ type: "inline", content: match[1] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < input.length) {
    parts.push({ type: "text", content: input.slice(lastIdx) });
  }
  return parts;
}
