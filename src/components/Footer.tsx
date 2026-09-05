import React from 'react';
import { DoodleTape } from '../utils/doodleIcons';
import { ExternalLink } from 'lucide-react';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const Footer: React.FC = () => {
  return (
    <footer className="relative mt-16 bg-[#FFFDF9] border-t-3 border-[#1E1E1E] py-8 px-4 sm:px-8 shadow-[0_-4px_0px_#1E1E1E]">
      <DoodleTape
        className="absolute -top-3 right-24 w-28 h-6"
        color="#BAE6FD"
        rotation="rotate-[-1deg]"
      />

      <div className="max-w-7xl mx-auto flex items-center justify-center text-sm">
        <a
          href="https://github.com/ulric-collaco"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2 px-4 py-2 bg-[#FAF8F5] border-2 border-[#1E1E1E] rounded-sketch-sm shadow-sketch-sm hover:shadow-sketch hover:-translate-y-0.5 transition-all text-[#1E1E1E]"
        >
          <GithubIcon size={18} className="text-[#1E1E1E] group-hover:scale-110 transition-transform" />
          <span className="font-hand text-lg font-bold">Made by</span>
          <span className="font-black underline decoration-2 decoration-[#2563EB] group-hover:text-[#2563EB]">
            Ulric Collaco
          </span>
        </a>
      </div>
    </footer>
  );
};
