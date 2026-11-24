'use client';

import { useState, useEffect } from 'react';
import {
  getAppliances,
  saveAppliance,
  updateApplianceState,
  deleteAppliance,
  getRooms,
  saveRoom,
  deleteRoom,
} from '../../lib/dataService.js';
import {
  estimateApplianceEnergy,
  estimateDailyEnergy,
  estimateLoad,
} from '../../lib/calculations.js';
import {
  Tv,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Zap,
  Power,
  Layers,
  DoorOpen,
} from 'lucide-react';

export default function AppliancesPage() {
  const [appliances, setAppliances] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State (Figure 3.7)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cooling',
    power_watts: 75,
    quantity: 1,
    daily_hours: 8,
    state: 'ON',
    room_id: '',
  });

  const loadData = async () => {
    try {
      const [list, roomList] = await Promise.all([getAppliances(), getRooms()]);
      setAppliances(list);
      setRooms(roomList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Cooling',
      power_watts: 75,
      quantity: 1,
      daily_hours: 8,
      state: 'ON',
      room_id: '',
    });
    setEditingId(null);
    setError('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (app) => {
    setEditingId(app.id);
    setFormData({
      name: app.name,
      category: app.category,
      power_watts: app.power_watts,
      quantity: app.quantity,
      daily_hours: app.daily_hours,
      state: app.state || 'ON',
      room_id: app.room_id || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleToggleState = async (app) => {
    const newState = (app.state || 'ON') === 'ON' ? 'OFF' : 'ON';
    try {
      await updateApplianceState(app.id, newState);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (app) => {
    setError('');
    try {
      await deleteAppliance(app.id, false);
      setSuccess(`Appliance "${app.name}" deleted successfully.`);
      setTimeout(() => setSuccess(''), 4000);
      await loadData();
    } catch (err) {
      if (err.message.includes('has usage records')) {
        const cascade = confirm(
          `Appliance "${app.name}" has recorded usage records.\n\nDo you want to permanently delete this appliance along with all its usage history?\n\n(Click Cancel if you prefer to just toggle its operating state to OFF)`
        );
        if (cascade) {
          try {
            await deleteAppliance(app.id, true);
            setSuccess(`Appliance "${app.name}" and its usage records deleted successfully.`);
            setTimeout(() => setSuccess(''), 4000);
            await loadData();
          } catch (delErr) {
            setError(delErr.message);
          }
        }
      } else {
        setError(err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await saveAppliance({
        id: editingId,
        ...formData,
      });

      setSuccess(`Appliance "${formData.name}" saved successfully.`);
      setTimeout(() => setSuccess(''), 4000);
      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await saveRoom({ name: newRoomName });
      setSuccess(`Room "${newRoomName.trim()}" added successfully.`);
      setTimeout(() => setSuccess(''), 4000);
      setNewRoomName('');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRoom = async (room) => {
    const count = appliances.filter((a) => a.room_id === room.id).length;
    const note =
      count > 0
        ? `\n\n${count} appliance(s) assigned to this room will become unassigned. They will not be deleted.`
        : '';
    if (!confirm(`Delete room "${room.name}"?${note}`)) return;
    setError('');
    try {
      await deleteRoom(room.id);
      setSuccess(`Room "${room.name}" deleted.`);
      setTimeout(() => setSuccess(''), 4000);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const roomNameFor = (roomId) => {
    if (!roomId) return 'Unassigned';
    const room = rooms.find((r) => r.id === roomId);
    return room ? room.name : 'Unassigned';
  };

  // Live Calculations
  const totalDailyEnergy = estimateDailyEnergy(
    appliances.map((a) => ({
      energy_kwh: estimateApplianceEnergy(a.power_watts, a.quantity, a.daily_hours),
    }))
  );
  const totalLoadKw = estimateLoad(appliances);

  // Live calculation inside modal
  const liveModalEnergy = estimateApplianceEnergy(
    formData.power_watts,
    formData.quantity,
    formData.daily_hours
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Appliance Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Register and manage the electrical appliances of Goodness Lodge, their power ratings, and daily operating estimates.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Appliance</span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-3.5 rounded text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 p-3.5 rounded text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <Check className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Top Summary Cards (Figure 3.7 & Section 4.2.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estimated Load Now (ON appliances)
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">
              {totalLoadKw.toFixed(2)} <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">kW</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {appliances.filter((a) => (a.state || 'ON') === 'ON').length} of {appliances.length} appliances switched ON
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded-lg">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Estimated Daily Consumption
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">
              {totalDailyEnergy.toFixed(1)} <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">kWh / day</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Combined estimated daily energy from all appliances
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Management */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-wider flex items-center space-x-2">
            <DoorOpen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Rooms ({rooms.length})</span>
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Assign appliances to rooms to see consumption per room
          </span>
        </div>
        <div className="p-4 space-y-3">
          {rooms.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No rooms added yet. Add the rooms of the residence below, then assign each
              appliance to the room where it is used.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => {
                const count = appliances.filter((a) => a.room_id === room.id).length;
                return (
                  <span
                    key={room.id}
                    className="inline-flex items-center space-x-2 pl-3 pr-1.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100 text-xs font-medium"
                  >
                    <span>
                      {room.name}
                      <span className="text-sky-500 dark:text-sky-400 font-normal"> · {count} appliance{count === 1 ? '' : 's'}</span>
                    </span>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      className="p-1 text-sky-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                      title={`Delete room ${room.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <form onSubmit={handleAddRoom} className="flex items-center gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="e.g. Room 1"
              className="flex-1 max-w-xs p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 text-xs bg-slate-900 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Room</span>
            </button>
          </form>
        </div>
      </div>

      {/* Appliances Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-wider">
            Registered Appliances ({appliances.length})
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Click ON/OFF to toggle operating state
          </span>
        </div>

        {appliances.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            No appliances registered yet. Click &quot;Add Appliance&quot; to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Appliance Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Power Rating</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Est. Daily Hours</th>
                  <th className="py-3 px-4">Operating State</th>
                  <th className="py-3 px-4">Est. Energy (kWh/day)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {appliances.map((app) => {
                  const energyKwh = estimateApplianceEnergy(
                    app.power_watts,
                    app.quantity,
                    app.daily_hours
                  );
                  const isOn = (app.state || 'ON') === 'ON';

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-50 flex items-center space-x-2">
                        <span>{app.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                          {app.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
                          {roomNameFor(app.room_id)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{app.power_watts} W</td>
                      <td className="py-3.5 px-4">{app.quantity}</td>
                      <td className="py-3.5 px-4">{app.daily_hours} hrs</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleState(app)}
                          title="Click to toggle state"
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition ${
                            isOn
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 border border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          <Power className="h-3 w-3" />
                          <span>{app.state || 'ON'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-50">
                        {energyKwh.toFixed(1)} kWh
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(app)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Edit Appliance"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(app)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                          title="Delete Appliance"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appliance Form Modal (Matching Figure 3.7) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end justify-center sm:items-center sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 max-h-[92dvh] overflow-y-auto animate-slide-up">
            <div className="sm:hidden mx-auto h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                {editingId ? 'Edit Appliance' : 'Add Appliance'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-3 rounded text-red-700 dark:text-red-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                  Appliance name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ceiling fan"
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="Lighting">Lighting</option>
                    <option value="Cooling">Cooling</option>
                    <option value="Refrigeration">Refrigeration</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Heating">Heating</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                    Operating state
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="ON">ON</option>
                    <option value="OFF">OFF</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                  Room
                </label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Unassigned</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  The room where this appliance is used. Rooms are managed on this page, above the appliance list.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                    Power rating (watts)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.power_watts}
                    onChange={(e) => setFormData({ ...formData, power_watts: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                    Estimated daily hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="any"
                    required
                    value={formData.daily_hours}
                    onChange={(e) => setFormData({ ...formData, daily_hours: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Live Energy Preview inside Form */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-amber-900 dark:text-amber-200 font-medium">
                Estimated energy: <span className="font-bold">{liveModalEnergy.toFixed(1)} kWh / day</span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg shadow-sm transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
