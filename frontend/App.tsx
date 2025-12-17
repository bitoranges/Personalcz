import React from 'react';
import { Background } from './components/Background';
import { Header } from './components/Header';
import { MaterialsCard } from './components/MaterialsCard';

const App: React.FC = () => {
  return (
    <>
      <Background />
      
      <main className="relative z-10 min-h-screen px-5 pt-14 pb-20 max-w-[920px] mx-auto md:pl-[50px]">
        <Header />

        {/* Main Content Area */}
        <section className="flex flex-col gap-6">
          {/* Materials - Takes full width now */}
          <MaterialsCard />
        </section>

        <footer className="mt-16 text-center md:text-left pt-6 border-t border-ink/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-xs text-ink2/50 uppercase tracking-widest">
            Powered by x402
          </p>
          <div className="flex gap-2">
             <div className="w-2 h-2 rounded-full bg-accent"></div>
             <div className="w-2 h-2 rounded-full bg-accent-violet"></div>
             <div className="w-2 h-2 rounded-full bg-accent-cyan"></div>
          </div>
        </footer>
      </main>
    </>
  );
};

export default App;