import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';

interface Role {
  id: number;
  name: string;
  description: string;
}

interface FormData {
  name: string;
  description: string;
  permissions: string[];
}

export default function RolesManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [_editingRole, _setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    permissions: [],
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/rbac');
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      setRoles(data.data);
    } catch (err) {
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const res = await fetch('/api/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      setFormData({ name: '', description: '', permissions: [] });
      setShowForm(false);
      fetchRoles();
    } catch (err) {
      console.error('Error creating role:', err);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (confirm('Are you sure?')) {
      try {
        await fetch(`/api/admin/rbac?id=${roleId}`, { method: 'DELETE' });
        fetchRoles();
      } catch (err) {
        console.error('Error deleting role:', err);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AdminLayout title="Role Management">
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 px-4 py-2 bg-neon text-bgDark rounded-lg"
      >
        New Role
      </button>

      {showForm && (
        <div className="bg-cardBg border border-border rounded-lg p-4 mb-6">
          <input
            type="text"
            placeholder="Role Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full mb-2 p-2 bg-bgDark border border-border rounded text-textPrimary"
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full mb-4 p-2 bg-bgDark border border-border rounded text-textPrimary"
          />
          <button
            onClick={handleCreateRole}
            className="px-4 py-2 bg-success text-bgDark rounded-lg"
          >
            Create
          </button>
        </div>
      )}

      <div className="space-y-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-cardBg border border-border rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <h4 className="text-textPrimary font-bold">{role.name}</h4>
              <p className="text-textSecondary text-sm">{role.description}</p>
            </div>
            <button
              onClick={() => handleDeleteRole(role.id)}
              disabled={role.name.includes('system')}
              className="px-3 py-1 bg-danger text-white rounded disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
