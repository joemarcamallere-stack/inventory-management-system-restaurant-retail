import { useMemo, useState } from 'react';
import {
  Edit3,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useSession } from '../../../../app/hooks/useSession';
import type { ApiDiningTable, DiningTableStatus } from '../../../../app/api/domainTypes';
import {
  useCreateRestaurantDiningTableMutation,
  useDeleteRestaurantDiningTableMutation,
  useRestaurantDiningTablesQuery,
  useRestaurantLocationsQuery,
  useUpdateRestaurantDiningTableMutation,
  useUpdateRestaurantDiningTableStatusMutation,
} from '../../../lib/restaurant';

type TableForm = {
  tableNumber: string;
  capacity: number;
  locationId: string;
  floor: string;
  notes: string;
};

const statusOptions: DiningTableStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'];

const emptyForm: TableForm = {
  tableNumber: '',
  capacity: 2,
  locationId: '',
  floor: '',
  notes: '',
};

function tableToForm(table: ApiDiningTable): TableForm {
  return {
    tableNumber: table.tableNumber,
    capacity: table.capacity,
    locationId: table.locationId,
    floor: table.floor ?? '',
    notes: table.notes ?? '',
  };
}

export default function TableManagementView() {
  const { currentUser } = useSession();
  const canManage = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DiningTableStatus>('ALL');
  const [editingTable, setEditingTable] = useState<ApiDiningTable | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TableForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ApiDiningTable | null>(null);

  const { data: tables = [], isLoading } = useRestaurantDiningTablesQuery({ limit: 250 });
  const { data: locations = [] } = useRestaurantLocationsQuery();
  const createTable = useCreateRestaurantDiningTableMutation();
  const updateTable = useUpdateRestaurantDiningTableMutation();
  const updateStatus = useUpdateRestaurantDiningTableStatusMutation();
  const deleteTable = useDeleteRestaurantDiningTableMutation();

  const filteredTables = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tables.filter((table) => {
      const matchesSearch = !term || [
        table.tableNumber,
        table.floor,
        table.notes,
        table.location?.name,
      ].some((value) => value?.toLowerCase().includes(term));
      const matchesLocation = locationFilter === 'ALL' || table.locationId === locationFilter;
      const matchesStatus = statusFilter === 'ALL' || table.status === statusFilter;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [locationFilter, search, statusFilter, tables]);

  const counts = useMemo(() => {
    return statusOptions.reduce(
      (summary, status) => ({
        ...summary,
        [status]: tables.filter((table) => table.status === status).length,
      }),
      {} as Record<DiningTableStatus, number>,
    );
  }, [tables]);

  const openCreate = () => {
    setEditingTable(null);
    setForm({ ...emptyForm, locationId: locations[0]?.id ?? '' });
    setShowForm(true);
  };

  const openEdit = (table: ApiDiningTable) => {
    setEditingTable(table);
    setForm(tableToForm(table));
    setShowForm(true);
  };

  const saveTable = async () => {
    if (!form.tableNumber.trim() || !form.locationId || form.capacity < 1) return;
    const payload = {
      tableNumber: form.tableNumber.trim(),
      capacity: form.capacity,
      locationId: form.locationId,
      floor: form.floor.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editingTable) {
      await updateTable.mutateAsync({ id: editingTable.id, data: payload });
    } else {
      await createTable.mutateAsync(payload);
    }
    setShowForm(false);
    setEditingTable(null);
    setForm(emptyForm);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteTable.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Table Management</h1>
          <p className="text-sm text-muted-foreground">Maintain floor layout, capacities, and live dining table status.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add Table
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg border p-4 text-left ${
              statusFilter === status ? 'border-primary bg-primary/10' : 'border-border bg-card'
            }`}
          >
            <p className="text-xs font-medium text-muted-foreground">{status.replace('_', ' ')}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{counts[status] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search table, floor, location"
            className="w-full bg-transparent text-sm outline-none xl:w-72"
          />
        </div>
        <select
          value={locationFilter}
          onChange={(event) => setLocationFilter(event.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
        >
          <option value="ALL">All locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'ALL' | DiningTableStatus)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
        >
          <option value="ALL">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>{status.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Floor</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTables.map((table) => (
                <tr key={table.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{table.tableNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{table.location?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{table.floor || '-'}</td>
                  <td className="px-4 py-3 text-foreground">{table.capacity}</td>
                  <td className="px-4 py-3">
                    <select
                      value={table.status}
                      onChange={(event) => updateStatus.mutate({
                        id: table.id,
                        status: event.target.value as DiningTableStatus,
                      })}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold outline-none"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{table.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(table)}
                        disabled={!canManage}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary disabled:opacity-40"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(table)}
                        disabled={!canManage || table.status === 'OCCUPIED'}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-destructive disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredTables.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No dining tables found.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading dining tables...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <TableFormModal
          form={form}
          locations={locations}
          title={editingTable ? 'Edit Table' : 'Add Table'}
          isSaving={createTable.isPending || updateTable.isPending}
          onChange={setForm}
          onClose={() => {
            setShowForm(false);
            setEditingTable(null);
            setForm(emptyForm);
          }}
          onSave={saveTable}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Delete Table</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Delete {deleteTarget.tableNumber}? Tables with linked kitchen orders cannot be deleted.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteTable.isPending}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleteTable.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TableFormModal({
  form,
  locations,
  title,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  form: TableForm;
  locations: { id: string; name: string }[];
  title: string;
  isSaving: boolean;
  onChange: (form: TableForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 px-5 py-4">
          <Field
            label="Table number"
            value={form.tableNumber}
            onChange={(value) => onChange({ ...form, tableNumber: value })}
          />
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-foreground">Location</span>
            <select
              value={form.locationId}
              onChange={(event) => onChange({ ...form, locationId: event.target.value })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-foreground">Capacity</span>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(event) => onChange({ ...form, capacity: Number(event.target.value) || 1 })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <Field
            label="Floor"
            value={form.floor}
            onChange={(value) => onChange({ ...form, floor: value })}
          />
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-foreground">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
              className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={onSave}
            disabled={!form.tableNumber.trim() || !form.locationId || form.capacity < 1 || isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Table'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
