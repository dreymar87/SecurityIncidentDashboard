import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { useUsers, useCreateUser, useDeleteUser, useResetPassword, useCurrentUser } from '../api/hooks';
import { User } from '../api/client';
import { UserPlus, Trash2, KeyRound, Shield, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PageProps {
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

export function UserManagement({ onMobileMenuToggle, isMobile }: PageProps) {
  const { data: currentUser } = useCurrentUser();
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetPassword();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer', email: '' });
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!currentUser) {
    return (
      <>
        <TopBar title="User Management" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
        <div className="p-6">
          <div className="card p-8 text-center space-y-3">
            <p style={{ color: 'var(--color-text-muted)' }}>You must be logged in as an admin to view this page.</p>
            <Link to="/login" className="text-sm text-sky-400 hover:text-sky-300 transition-colors">
              Go to login
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <>
        <TopBar title="User Management" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
        <div className="p-6">
          <div className="card p-8 text-center">
            <p style={{ color: 'var(--color-text-muted)' }}>Admin access required to view this page.</p>
          </div>
        </div>
      </>
    );
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createUser.mutateAsync(newUser);
      setSuccess(`User '${newUser.username}' created successfully`);
      setNewUser({ username: '', password: '', role: 'viewer', email: '' });
      setShowAddForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create user';
      setError(msg);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setError('');
    setSuccess('');
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      setSuccess(`User '${deleteTarget.username}' deleted`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete user';
      setError(msg);
      setDeleteTarget(null);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setError('');
    setSuccess('');
    try {
      await resetPassword.mutateAsync({ userId: resetTarget.id, password: newPassword });
      setSuccess(`Password reset for '${resetTarget.username}'`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reset password';
      setError(msg);
    }
  }

  return (
    <>
      <TopBar title="User Management" onMobileMenuToggle={onMobileMenuToggle} isMobile={isMobile} />
      <div className="p-6 space-y-6 max-w-4xl">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        {/* Header with Add button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>Users</h3>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setError(''); }}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
          >
            <UserPlus size={14} />
            Add User
          </button>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <form onSubmit={handleCreateUser} className="card p-4 space-y-3">
            <h4 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>New User</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
                minLength={3}
                className="input text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength={6}
                className="input text-sm"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="input text-sm"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="input text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createUser.isPending} className="btn-primary text-xs py-1.5">
                {createUser.isPending ? 'Creating...' : 'Create User'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary text-xs py-1.5">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Users Table */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th scope="col" className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Username</th>
                <th scope="col" className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Role</th>
                <th scope="col" className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Created</th>
                <th scope="col" className="text-right py-3 px-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--color-text-faint)' }}>Loading...</td></tr>
              ) : !users?.length ? (
                <tr><td colSpan={4} className="py-8 text-center" style={{ color: 'var(--color-text-faint)' }}>No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="py-3 px-4">
                      <span style={{ color: 'var(--color-text-primary)' }}>{user.username}</span>
                      {user.email && <span className="ml-2 text-xs" style={{ color: 'var(--color-text-faint)' }}>{user.email}</span>}
                      {currentUser?.id === user.id && <span className="ml-2 text-xs text-sky-400">(you)</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        user.role === 'admin'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                      }`}>
                        {user.role === 'admin' ? <Shield size={10} /> : <Eye size={10} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--color-text-faint)' }}>
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setResetTarget(user); setNewPassword(''); }}
                          className="text-gray-400 hover:text-sky-400 transition-colors"
                          title="Reset password"
                          aria-label={`Reset password for ${user.username}`}
                        >
                          <KeyRound size={14} />
                        </button>
                        {currentUser?.id !== user.id && (
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete user"
                            aria-label={`Delete user ${user.username}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Reset Password Modal */}
        {resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <form onSubmit={handleResetPassword} className="card p-6 w-full max-w-sm space-y-4">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Reset Password for '{resetTarget.username}'
              </h4>
              <input
                type="password"
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="input text-sm w-full"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="submit" disabled={resetPassword.isPending} className="btn-primary text-xs py-1.5">
                  {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
                <button type="button" onClick={() => setResetTarget(null)} className="btn-secondary text-xs py-1.5">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 w-full max-w-sm space-y-4">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Delete User
              </h4>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Are you sure you want to delete user <strong>'{deleteTarget.username}'</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteUser.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 rounded-lg transition-colors"
                >
                  {deleteUser.isPending ? 'Deleting...' : 'Delete'}
                </button>
                <button onClick={() => setDeleteTarget(null)} className="btn-secondary text-xs py-1.5">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
