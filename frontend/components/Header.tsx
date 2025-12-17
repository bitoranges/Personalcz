import React from 'react';
import { Twitter, Send } from 'lucide-react';
import { CONFIG } from '../constants';

export const Header: React.FC = () => {
  // *** FIX: 使用绝对路径引用 assets 文件夹中的图片 ***
  // 在 Web 环境中，'/assets/avatar.svg' 指向的是网站根目录下的 assets 文件夹
  const avatarImage = '/assets/avatar.png';

  return (
    <header className="flex flex-col md:flex-row gap-8 md:gap-12 items-start mb-14 md:mb-16">
      {/* Avatar Container - Enhanced Design */}
      <div className="relative group shrink-0 mt-2">
        {/* Outer decorative ring */}
        <div className="absolute -inset-1 rounded-full border-2 border-ink/10 border-dashed animate-[spin_10s_linear_infinite]"></div>
        
        {/* Main Avatar Box */}
        <div className="relative w-[84px] h-[84px] md:w-[110px] md:h-[110px] rounded-full overflow-hidden border-[3px] border-ink bg-white shadow-soft transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 z-10">
          <img 
            src={avatarImage}
            alt="Chengzi Avatar" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              // 简单的容错处理：如果图片加载失败，显示一个粉色背景
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.style.backgroundColor = '#FF5AA8';
            }}
          />
        </div>
        
        {/* Status Indicator */}
        <div className="absolute -bottom-1 -right-1 z-20 w-7 h-7 bg-accent border-[3px] border-ink rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Text Content */}
      <div className="flex-1 flex flex-col items-start pt-1">
        
        {/* 1. Motto: Tightened leading for poster-like effect */}
        <h1 className="font-sans font-black text-4xl md:text-6xl leading-[0.95] tracking-tighter text-ink mb-6 max-w-3xl drop-shadow-sm">
          {CONFIG.motto}
        </h1>

        {/* 2. Decorative Divider */}
        <div className="w-20 h-1.5 bg-gradient-to-r from-accent via-accent-violet to-accent-cyan rounded-full border border-ink/10 mb-6"></div>

        {/* 3. Tagline */}
        <p className="font-medium text-ink2 text-base md:text-lg leading-relaxed max-w-2xl mb-8">
          {CONFIG.tagline}
        </p>

        {/* 4. Social Buttons */}
        <div className="flex flex-wrap gap-3">
          <a 
            href={CONFIG.socials.x} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-[2px] border-ink bg-white hover:bg-ink hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm font-bold text-ink group"
          >
            <Twitter size={18} className="transition-transform group-hover:scale-110" />
            <span>Twitter</span>
          </a>
          
          <a 
            href={CONFIG.socials.telegram} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-[2px] border-ink bg-white hover:bg-ink hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm font-bold text-ink group"
          >
            <Send size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span>Telegram</span>
          </a>
        </div>
      </div>
    </header>
  );
};