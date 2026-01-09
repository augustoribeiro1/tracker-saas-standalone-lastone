'use client';

import { SessionProvider } from 'next-auth/react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

function DashboardNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'Campanhas', href: '/campaigns' },
    { name: 'Checkout', href: '/webhooks' },
    { name: 'Domínios', href: '/domains' },
    { name: 'Planos', href: '/pricing' },
    { name: 'Minha Conta', href: '/account' },
  ];

  return (
    <>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Botão Hamburguer Mobile */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {/* ✅ LOGO RESPONSIVA */}
              <Link href="/" className="flex-shrink-0 flex items-center ml-2 sm:ml-0">
                <Image
                  src="/logo.png"
                  alt="Split2"
                  width={140}
                  height={50}
                  priority
                  className="h-8 w-auto sm:h-10"
                  style={{ objectFit: 'contain' }}
                />
              </Link>

              {/* Menu Desktop */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {session?.user?.plan || 'free'}
                </span>
              </div>
              <div className="ml-4 flex items-center">
                <span className="text-sm text-gray-700 mr-4 hidden sm:inline">{session?.user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Menu Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 sm:hidden">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <Image
                  src="/logo.png"
                  alt="Split2"
                  width={120}
                  height={40}
                  className="h-8 w-auto"
                  style={{ objectFit: 'contain' }}
                />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* User Info */}
              <div className="p-4 border-b bg-gray-50">
                <p className="text-sm font-medium text-gray-900">{session?.user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Plano: <span className="font-medium text-blue-600">{session?.user?.plan || 'free'}</span>
                </p>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`${
                        pathname === item.href
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } block pl-3 pr-4 py-3 border-l-4 text-base font-medium`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Footer - Logout */}
              <div className="p-4 border-t">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
