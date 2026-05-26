// src/components/RichTextDisplay.jsx
export default function RichTextDisplay({ content, className = '' }) {
  if (!content) return null;

  const isHtml = /<[^>]+>/.test(content);

  if (!isHtml) {
    return <p className={`text-sm text-muted ${className}`}>{content}</p>;
  }

  return (
    <div
      className={`
        text-sm text-muted leading-relaxed
        [&_strong]:font-bold [&_strong]:text-cream
        [&_em]:italic
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
        [&_li]:my-0.5
        [&_a]:text-accent [&_a]:underline [&_a]:hover:opacity-80
        [&_p]:my-0.5
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}