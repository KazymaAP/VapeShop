import React from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-cardBg border-b border-border p-4">
          <h1 className="text-2xl font-bold text-neon">{title}</h1>
        </header>
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
