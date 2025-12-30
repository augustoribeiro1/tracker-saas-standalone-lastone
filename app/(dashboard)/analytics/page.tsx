'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/campaigns');
  }, [router]);
  
  return (
    <div className="p-6 text-center">
      <p className="text-gray-600">Redirecionando para Campanhas...</p>
    </div>
  );
}
