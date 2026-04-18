'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import AuthGuard from './AuthGuard';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  return (
    <AuthGuard>
      {!isLandingPage && <Sidebar />}
      <main 
        className={`flex-1 min-h-screen ${!isLandingPage ? 'ml-[240px]' : ''}`} 
        style={{ background: "#ffffff" }}
      >
        {isLandingPage ? (
          children
        ) : (
          <div className="max-w-6xl mx-auto px-8 py-8">
            {children}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
