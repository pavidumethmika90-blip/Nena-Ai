import React, {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Check, Copy} from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  children: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({language, children}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard errors in restricted contexts
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-400">
        <span className="font-mono lowercase">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-teal-500"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-teal-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({content}) => {
  return (
    <div className="prose-chat text-[15px] leading-[1.75] text-slate-800 dark:text-slate-100 dark:tracking-[0.005em] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({children}) => (
            <h1 className="mt-5 mb-2.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({children}) => (
            <h2 className="mt-4 mb-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({children}) => (
            <h3 className="mt-3.5 mb-1.5 text-base font-semibold text-slate-900 dark:text-white first:mt-0">
              {children}
            </h3>
          ),
          p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({children}) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({children}) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">
              {children}
            </ol>
          ),
          li: ({children}) => <li className="leading-[1.7]">{children}</li>,
          blockquote: ({children}) => (
            <blockquote className="my-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 text-slate-700 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          a: ({href, children}) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal-700 underline decoration-teal-600/40 underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-4 border-slate-200 dark:border-slate-800" />
          ),
          table: ({children}) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({children}) => (
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              {children}
            </thead>
          ),
          th: ({children}) => (
            <th className="border-b border-slate-200 dark:border-slate-800 px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({children}) => (
            <td className="border-b border-slate-100 dark:border-slate-800/70 px-3 py-2">
              {children}
            </td>
          ),
          code: ({className, children, ...props}) => {
            const match = /language-(\w+)/.exec(className || '');
            const text = String(children).replace(/\n$/, '');
            const isBlock = Boolean(match) || text.includes('\n');
            if (isBlock) {
              return <CodeBlock language={match?.[1]}>{text}</CodeBlock>;
            }
            return (
              <code
                {...props}
                className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[13px] text-slate-900 dark:text-slate-100"
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
