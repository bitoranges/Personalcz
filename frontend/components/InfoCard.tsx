import React from 'react';

interface InfoCardProps {
  title: string;
  lines: string[];
  variant?: 'pink' | 'cyan' | 'violet';
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, lines, variant = 'pink' }) => {
  const accentColorClass = {
    pink: 'bg-accent',
    cyan: 'bg-accent-cyan',
    violet: 'bg-accent-violet',
  }[variant];

  return (
    <article className="bg-card border-[2px] border-ink rounded-[22px] p-6 md:p-8 shadow-soft backdrop-blur-md flex flex-col h-full transition-transform hover:-translate-y-1 duration-300">
      <h2 className="font-mono font-bold text-2xl tracking-tight mb-2">{title}</h2>
      
      {/* Decorative accent line */}
      <div className={`h-1.5 w-[80px] rounded-full border-[2px] border-ink mb-6 ${accentColorClass}`}></div>
      
      <div className="mt-auto space-y-2">
        {lines.map((line, idx) => (
            <p key={idx} className="text-ink2 text-sm md:text-base font-medium leading-relaxed flex items-center gap-2">
               {idx === 0 && <span className={`w-1.5 h-1.5 rounded-full ${accentColorClass}`}></span>}
              {line}
            </p>
        ))}
      </div>
    </article>
  );
};