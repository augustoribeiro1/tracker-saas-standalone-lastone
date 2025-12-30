'use client';

export default function AnalyticsPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Visualize métricas e performance de todas as suas campanhas
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center py-12">
        <svg
          className="h-24 w-24 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Analytics Global</h3>
        <p className="mt-1 text-sm text-gray-500 text-center max-w-md">
          Crie campanhas para ver métricas agregadas aqui. Você pode acessar analytics
          individuais clicando em cada campanha na página "Campanhas".
        </p>
      </div>
    </div>
  );
}
