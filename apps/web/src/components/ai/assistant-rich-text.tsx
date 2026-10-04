import { splitAssistantLines } from '@/lib/ai/messages';

type AssistantRichTextProps = {
  content: string;
};

export function AssistantRichText({ content }: AssistantRichTextProps) {
  const lines = splitAssistantLines(content);

  return (
    <div className="eckam-ai-rich-text">
      {lines.map((line, index) => (
        <p key={`${index}-${line.slice(0, 24)}`}>{renderInline(line)}</p>
      ))}
    </div>
  );
}

function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}
