import { useMemo } from "react";
import katex from "katex";

export default function Formula({ value }: { value: string }) {
  const html = useMemo(
    () =>
      katex.renderToString(value, {
        throwOnError: false,
        displayMode: true,
        output: "htmlAndMathml",
        trust: false,
      }),
    [value],
  );
  return <div className="formula" dangerouslySetInnerHTML={{ __html: html }} />;
}
