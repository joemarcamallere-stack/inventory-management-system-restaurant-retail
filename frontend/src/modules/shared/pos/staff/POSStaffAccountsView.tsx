import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Edit2,
  Eye,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AuthUser } from '../../../../app/api/client';
import type { ApiUser, UserRole, UserStatus, BusinessModule } from '../../../../app/api/domainTypes';
import {
  createUser,
  deleteUser,
  updateUser,
} from '../../../../app/api/client';
import {
  domainQueryKeys,
  useDomainMutation,
  useUsersQuery,
} from '../../../lib/domainQueries';

type Props = {
  module: BusinessModule;
  currentUser: AuthUser | null;
};

type StaffForm = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
};

const roleLabels: Record<UserRole, string> = {
  Admin: 'Admin',
  Manager: 'Manager',
  Staff: 'Staff',
  Cashier: 'Cashier',
  KitchenStaff: 'Kitchen Staff',
  RetailStaff: 'Retail Staff',
};

const restaurantRoles: UserRole[] = ['Staff', 'Cashier', 'KitchenStaff', 'Manager', 'Admin'];
const retailRoles: UserRole[] = ['Staff', 'Cashier', 'RetailStaff', 'Manager', 'Admin'];

const initialForm = (module: BusinessModule): StaffForm => ({
  name: '',
  email: '',
  role: module === 'RESTAURANT' ? 'Cashier' : 'RetailStaff',
  password: '',
  confirmPassword: '',
});

export default function POSStaffAccountsView({ module, currentUser }: Props) {
  const isAdmin = currentUser?.role === 'Admin';
  const roles = module === 'RESTAURANT' ? restaurantRoles : retailRoles;
  const moduleLabel = module === 'RESTAURANT' ? 'restaurant' : 'retail';
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<StaffForm>(() => initialForm(module));

  const { data: users = [], isLoading } = useUsersQuery({ enabled: isAdmin });
  const createUserMutation = useDomainMutation(createUser, [domainQueryKeys.users]);
  const updateUserMutation = useDomainMutation(
    ({ id, data }: { id: string; data: Record<string, unknown> }) => updateUser(id, data),
    [domainQueryKeys.users],
  );
  const deleteUserMutation = useDomainMutation(deleteUser, [domainQueryKeys.users]);

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-red-50">
            <Eye className="size-10 text-red-600" />
          </div>
          <h3 className="mb-2 text-[24px] font-bold text-[#111827]">Access Denied</h3>
          <p className="text-[14px] text-[#8a8fb0]">
            This section is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setForm(initialForm(module));
    setSelectedUser(null);
  };

  const validatePassword = () => {
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!validatePassword()) return;
    if (users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) {
      toast.error('A user with this email already exists');
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        status: 'Active',
      });
      toast.success('Staff account created');
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create staff account');
    }
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (users.some((user) => user.id !== selectedUser.id && user.email.toLowerCase() === form.email.trim().toLowerCase())) {
      toast.error('A user with this email already exists');
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          role: selectedUser.email === currentUser?.email ? selectedUser.role : form.role,
          status: selectedUser.status,
        },
      });
      toast.success('Staff account updated');
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update staff account');
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser || !validatePassword()) return;

    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        data: { password: form.password },
      });
      toast.success('Password reset');
      setShowPasswordModal(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  const handleToggleStatus = async (user: ApiUser) => {
    const nextStatus: UserStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    if (user.email === currentUser?.email && nextStatus === 'Inactive') {
      toast.error('You cannot deactivate your own account');
      return;
    }
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: { status: nextStatus },
      });
      toast.success(`Staff account ${nextStatus.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleDelete = async (user: ApiUser) => {
    if (user.email === currentUser?.email) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteUserMutation.mutateAsync(user.id);
      toast.success('Staff account deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete staff account');
    }
  };

  const openEdit = (user: ApiUser) => {
    setSelectedUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: roles.includes(user.role) ? user.role : roles[0],
      password: '',
      confirmPassword: '',
    });
    setShowEditModal(true);
  };

  const openPassword = (user: ApiUser) => {
    setSelectedUser(user);
    setForm({ ...initialForm(module), password: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  return (
    <div className="min-h-full bg-[#f8fafb] p-8 font-['Inter',sans-serif]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight text-[#008967]">User Management</h1>
          <p className="mt-1 text-[15px] text-[#9a9fc0]">
            Manage staff accounts for {currentUser?.name || `this ${moduleLabel} store`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex h-10 items-center gap-2 rounded-[8px] bg-[#008967] px-4 text-[14px] font-medium text-white transition hover:bg-[#007a5e]"
        >
          <Plus className="size-4" />
          Add Staff
        </button>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b border-[#e2e8f0] bg-[#f1f5f9]">
            <tr>
              <TableHead>User ID</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Staff Type</TableHead>
              <TableHead>Store ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-[#9a9fc0]">Loading staff accounts...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-[#9a9fc0]">No staff accounts have been created for this store yet.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-[#edf2f7] transition hover:bg-[#f8fafb]">
                  <td className="px-6 py-4 text-[14px] text-[#111827]">{user.id}</td>
                  <td className="px-6 py-4">
                    <span className="text-[14px] text-[#111827]">{user.name}</span>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-[#111827]">{user.email}</td>
                  <td className="px-6 py-4 text-[14px] text-[#111827]">{roleLabels[user.role]}</td>
                  <td className="px-6 py-4 text-[14px] text-[#111827]">POS Staff</td>
                  <td className="px-6 py-4 text-[14px] text-[#111827]">-</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user)}
                      className={`text-[14px] transition hover:opacity-80 ${user.status === 'Active' ? 'text-[#008967]' : 'text-red-600'}`}
                    >
                      {user.status}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <IconButton title="Edit User" onClick={() => openEdit(user)} tone="secondary">
                        <Edit2 className="size-4" />
                      </IconButton>
                      <IconButton title="Reset Password" onClick={() => openPassword(user)} tone="warning">
                        <RefreshCw className="size-4" />
                      </IconButton>
                      <IconButton title="Delete User" onClick={() => handleDelete(user)} tone="danger">
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <StaffModal title="Add New User" onClose={() => { setShowAddModal(false); resetForm(); }}>
          <StaffFormFields
            form={form}
            roles={roles}
            submitLabel="Create User"
            onSubmit={handleCreate}
            onCancel={() => { setShowAddModal(false); resetForm(); }}
            onChange={setForm}
            includePassword
          />
        </StaffModal>
      )}

      {showEditModal && selectedUser && (
        <StaffModal title="Edit User" onClose={() => { setShowEditModal(false); resetForm(); }}>
          <StaffFormFields
            form={form}
            roles={roles}
            submitLabel="Save Changes"
            onSubmit={handleUpdate}
            onCancel={() => { setShowEditModal(false); resetForm(); }}
            onChange={setForm}
            disableRole={selectedUser.email === currentUser?.email}
            note={selectedUser.email === currentUser?.email ? 'You cannot change your own role.' : 'To change the password, use the Reset Password action.'}
          />
        </StaffModal>
      )}

      {showPasswordModal && selectedUser && (
        <StaffModal title="Reset Password" onClose={() => { setShowPasswordModal(false); resetForm(); }}>
          <form onSubmit={handleResetPassword}>
            <p className="mb-4 text-[14px] text-[#9a9fc0]">
              Reset password for <strong className="text-[#111827]">{selectedUser.name}</strong>
            </p>
            <PasswordFields form={form} onChange={setForm} />
            <ModalActions submitLabel="Reset Password" onCancel={() => { setShowPasswordModal(false); resetForm(); }} />
          </form>
        </StaffModal>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[#e2e8f0] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-[12px] text-[#9a9fc0]">{label}</p>
          <p className="text-[28px] font-bold text-[#111827]">{value}</p>
          <p className="mt-2 text-[11px] text-[#008967]">{detail}</p>
        </div>
        <div className="flex size-14 items-center justify-center rounded-full bg-[#008967]/10">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value, tone }: { label: string; value: number; tone: 'secondary' | 'warning' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[#111827]">{label}</span>
      <span className={`text-[14px] font-bold ${tone === 'warning' ? 'text-amber-600' : 'text-[#008967]'}`}>{value}</span>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#111827]">{children}</th>;
}

function RoleBadge({ role }: { role: UserRole }) {
  const className = role === 'Admin'
    ? 'bg-amber-50 text-amber-600'
    : 'bg-[#008967]/10 text-[#008967]';
  return (
    <span className={`rounded px-2 py-1 text-[12px] font-semibold ${className}`}>
      {roleLabels[role]}
    </span>
  );
}

function IconButton({
  children,
  title,
  tone,
  onClick,
}: {
  children: ReactNode;
  title: string;
  tone: 'secondary' | 'warning' | 'danger';
  onClick: () => void;
}) {
  const classes = {
    secondary: 'text-[#008967] hover:bg-[#008967]/10',
    warning: 'text-amber-600 hover:bg-amber-50',
    danger: 'text-red-600 hover:bg-red-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-[6px] p-2 transition ${classes[tone]}`}
    >
      {children}
    </button>
  );
}

function StaffModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="max-h-[90vh] w-[500px] overflow-y-auto rounded-[14px] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[20px] font-bold text-[#111827]">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#9a9fc0] transition hover:text-[#111827]">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StaffFormFields({
  form,
  roles,
  submitLabel,
  onSubmit,
  onCancel,
  onChange,
  includePassword = false,
  disableRole = false,
  note,
}: {
  form: StaffForm;
  roles: UserRole[];
  submitLabel: string;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  onChange: (form: StaffForm) => void;
  includePassword?: boolean;
  disableRole?: boolean;
  note?: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4">
        <Field label="Full Name" required>
          <input
            type="text"
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            className="h-10 w-full rounded-[8px] border border-[#e2e8f0] px-4 text-[14px] outline-none focus:border-[#008967]"
            placeholder="Enter full name"
            required
          />
        </Field>
        <Field label="Email Address" required>
          <input
            type="email"
            value={form.email}
            onChange={(event) => onChange({ ...form, email: event.target.value })}
            className="h-10 w-full rounded-[8px] border border-[#e2e8f0] px-4 text-[14px] outline-none focus:border-[#008967]"
            placeholder="Enter email address"
            required
          />
        </Field>
        <Field label="Role" required>
          <select
            value={form.role}
            onChange={(event) => onChange({ ...form, role: event.target.value as UserRole })}
            className="h-10 w-full rounded-[8px] border border-[#e2e8f0] px-4 text-[14px] outline-none focus:border-[#008967] disabled:bg-[#f8fafb]"
            disabled={disableRole}
            required
          >
            {roles.map((role) => (
              <option key={role} value={role}>{roleLabels[role]}</option>
            ))}
          </select>
        </Field>
        {includePassword && <PasswordFields form={form} onChange={onChange} />}
        {note && (
          <div className="rounded-[8px] border border-[#008967] bg-[#008967]/10 p-3 text-[12px] text-[#008967]">
            <strong>Note:</strong> {note}
          </div>
        )}
      </div>
      <ModalActions submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

function PasswordFields({ form, onChange }: { form: StaffForm; onChange: (form: StaffForm) => void }) {
  return (
    <>
      <Field label="Password" required>
        <input
          type="password"
          value={form.password}
          onChange={(event) => onChange({ ...form, password: event.target.value })}
          className="h-10 w-full rounded-[8px] border border-[#e2e8f0] px-4 text-[14px] outline-none focus:border-[#008967]"
          placeholder="Enter password (min. 6 characters)"
          minLength={6}
          required
        />
      </Field>
      <Field label="Confirm Password" required>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(event) => onChange({ ...form, confirmPassword: event.target.value })}
          className="h-10 w-full rounded-[8px] border border-[#e2e8f0] px-4 text-[14px] outline-none focus:border-[#008967]"
          placeholder="Confirm password"
          minLength={6}
          required
        />
      </Field>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-[#111827]">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

function ModalActions({ submitLabel, onCancel }: { submitLabel: string; onCancel: () => void }) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type="submit"
        className="flex-1 rounded-[8px] bg-[#008967] py-2 text-[14px] font-medium text-white transition hover:bg-[#007a5e]"
      >
        {submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-[8px] border border-[#e2e8f0] py-2 text-[14px] font-medium text-[#111827] transition hover:bg-[#f1f5f9]"
      >
        Cancel
      </button>
    </div>
  );
}
