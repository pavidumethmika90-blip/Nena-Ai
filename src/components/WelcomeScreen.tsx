import React from 'react';
import {MessageSquare} from 'lucide-react';

interface StarterPrompt {
  language: string;
  title: string;
  prompt: string;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    language: 'සිංහල',
    title: 'ශ්‍රී ලංකාවේ සංචාරක ස්ථාන',
    prompt: 'ශ්‍රී ලංකාවේ නැරඹිය යුතු සුන්දර සංචාරක ස්ථාන 5ක් ගැන කෙටියෙන් කියන්න.',
  },
  {
    language: 'English',
    title: 'Explain a topic clearly',
    prompt: 'Explain how solar panels generate electricity in simple everyday terms.',
  },
  {
    language: 'தமிழ்',
    title: 'தமிழில் உதவி பெறுங்கள்',
    prompt: 'ஆரோக்கியமான காலை உணவுக்கான 3 எளிய யோசனைகளைச் சொல்லுங்கள்.',
  },
  {
    language: 'Español',
    title: 'Write in any language',
    prompt: 'Dame 3 consejos prácticos para aprender un idioma nuevo más rápido.',
  },
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({onSelectPrompt}) => {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
        <MessageSquare className="h-6 w-6" />
      </div>

      <h1 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
        How can Nena AI help you today?
      </h1>
      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Ask anything in Sinhala, English, Tamil, or any major language. Nena AI always replies in your language.
      </p>

      <div className="mt-7 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
        {STARTER_PROMPTS.map((item) => (
          <button
            key={item.language}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className="flex min-h-[56px] flex-col items-start justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
              {item.language}
            </span>
            <span className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
              {item.title}
            </span>
            <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {item.prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
