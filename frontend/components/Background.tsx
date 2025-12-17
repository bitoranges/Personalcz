import React from 'react';

export const Background: React.FC = () => {
  return (
    <>
      {/* Signature Left Stripe - Multicolored */}
      <div className="fixed top-0 bottom-0 left-0 w-[22px] z-0 hidden lg:flex flex-col">
         <div className="flex-1 w-full bg-ink"></div>
         <div className="h-[200px] w-full bg-accent-violet"></div>
         <div className="h-[200px] w-full bg-accent-cyan"></div>
         <div className="h-[200px] w-full bg-accent"></div>
      </div>

      {/* Ambient Blobs - More opaque and colorful */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#F4F4F6]">
        {/* Cyan Blob (Bottom Left) */}
        <div 
          className="absolute -left-[10%] bottom-[-10%] w-[70vw] h-[70vw] rounded-full opacity-40 blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }}
        />
        
        {/* Violet/Pink Blob (Top Right) */}
        <div 
          className="absolute -right-[10%] -top-[10%] w-[80vw] h-[80vw] rounded-full opacity-40 blur-[90px] mix-blend-multiply"
          style={{ 
            background: `
              radial-gradient(circle at 50% 50%, rgba(139,92,246,0.35), transparent 60%),
              radial-gradient(circle at 80% 20%, rgba(255,90,168,0.25), transparent 50%)
            ` 
          }}
        />

        {/* Center Warm Glow */}
        <div 
          className="absolute left-[30%] top-[40%] w-[40vw] h-[40vw] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(255,200,100,0.3) 0%, transparent 70%)' }}
        />
      </div>

      {/* Grain Texture Overlay */}
      <div className="fixed inset-0 bg-grain opacity-40 pointer-events-none z-0"></div>
    </>
  );
};