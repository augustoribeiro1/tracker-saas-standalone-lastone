'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const updateUserPlan = async (userId: number, plan: string) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan })
    });

    fetchUsers();
    setEditingUser(null);
  };

  const suspendUser = async (userId: number) => {
    if (!confirm('Tem certeza que deseja suspender este usuário?')) return;

    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status: 'suspended' })
    });

    fetchUsers();
  };

  const activateUser = async (userId: number) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status: 'active' })
    });

    fetchUsers();
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Gerenciar Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">
          Administração de todos os usuários do sistema
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cadastro</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name || 'Sem nome'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUser?.id === user.id ? (
                    <select
                      value={editingUser.plan}
                      onChange={(e) => setEditingUser({ ...editingUser, plan: e.target.value })}
                      className="text-sm rounded-md border-gray-300"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="agency">Agency</option>
                    </select>
                  ) : (
                    <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800">
                      {user.plan}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {editingUser?.id === user.id ? (
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        onClick={() => updateUserPlan(user.id, editingUser.plan)}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingUser(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar Plano
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => suspendUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Suspender
                        </button>
                      ) : (
                        <button
                          onClick={() => activateUser(user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Ativar
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">📊 Estatísticas Globais</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-blue-600 font-semibold">Total de Usuários</div>
            <div className="text-2xl font-bold text-blue-900">{users.length}</div>
          </div>
          <div>
            <div className="text-blue-600 font-semibold">Plano Free</div>
            <div className="text-2xl font-bold text-blue-900">
              {users.filter(u => u.plan === 'free').length}
            </div>
          </div>
          <div>
            <div className="text-blue-600 font-semibold">Pagantes</div>
            <div className="text-2xl font-bold text-blue-900">
              {users.filter(u => u.plan !== 'free').length}
            </div>
          </div>
          <div>
            <div className="text-blue-600 font-semibold">Suspensos</div>
            <div className="text-2xl font-bold text-blue-900">
              {users.filter(u => u.status === 'suspended').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
