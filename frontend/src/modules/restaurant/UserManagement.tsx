import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit, Plus, Search, Trash2, X } from "lucide-react";
import { createUser, deleteUser, getUsers, updateUser } from "../../app/api/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
};

const blankForm = () => ({
  name: "",
  email: "",
  password: "",
  role: "Staff",
  status: "Active",
});

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm());

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await getUsers());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        (roleFilter === "all" || user.role === roleFilter) &&
        (user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)),
    );
  }, [roleFilter, searchQuery, users]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setShowForm(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
    });
    setShowForm(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateUser(editing.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          status: form.status,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          status: form.status,
        });
      }
      await loadUsers();
      setShowForm(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    setError(null);
    try {
      await deleteUser(deleting.id);
      await loadUsers();
      setDeleting(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div><h1 className="text-xl font-bold">User Management</h1><p className="text-sm text-muted-foreground">Business users persisted through the backend</p></div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white"><Plus className="h-4 w-4" />Add User</button>
      </div>

      {error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}<button onClick={() => setError(null)} className="ml-auto underline">Dismiss</button></div>}

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search users" className="w-full rounded-xl border border-input bg-input-background py-2 pl-10 pr-3" /></div>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border border-input bg-input-background px-3 py-2"><option value="all">All roles</option>{["Admin", "Manager", "Staff", "Cashier", "KitchenStaff"].map((role) => <option key={role} value={role}>{role}</option>)}</select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? <p className="p-8 text-center text-muted-foreground">Loading users...</p> : filteredUsers.length === 0 ? <p className="p-8 text-center text-muted-foreground">No users found.</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border bg-muted/50 text-left"><tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Last login</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-border">{filteredUsers.map((user) => <tr key={user.id}><td className="px-5 py-4"><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></td><td className="px-5 py-4">{user.role}</td><td className="px-5 py-4">{user.status}</td><td className="px-5 py-4">{new Date(user.lastLogin).toLocaleString()}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => openEdit(user)} className="rounded-lg p-2 hover:bg-muted"><Edit className="h-4 w-4" /></button><button onClick={() => setDeleting(user)} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSave} className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">{editing ? "Edit User" : "Add User"}</h2><button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-4">
              <label className="text-sm">Name<input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Password {editing && "(leave blank to keep current)"}<input required={!editing} minLength={6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2">{["Admin", "Manager", "Staff", "Cashier", "KitchenStaff"].map((role) => <option key={role}>{role}</option>)}</select></label>
              <label className="text-sm">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2"><option>Active</option><option>Inactive</option></select></label>
            </div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : "Save User"}</button></div>
          </form>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"><h2 className="text-xl font-bold">Delete {deleting.name}?</h2><p className="mt-2 text-sm text-muted-foreground">This operation is blocked by the backend when the user owns dependent records.</p><div className="mt-5 flex justify-end gap-3"><button onClick={() => setDeleting(null)} className="rounded-xl border border-border px-4 py-2">Cancel</button><button disabled={saving} onClick={() => void handleDelete()} className="rounded-xl bg-red-600 px-4 py-2 text-white">Delete</button></div></div></div>
      )}
    </div>
  );
}
