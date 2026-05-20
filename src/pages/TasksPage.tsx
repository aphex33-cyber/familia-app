import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  useTasks, useCreateTask, useUpdateTask, useUpdateTaskStatus,
  useDeleteTask, useAwardPoints,
} from '../application/useTasks';
import { useMembers } from '../application/useMembers';
import { sortTasksByPriority, formatFrequency, getTasksForToday } from '../domain/taskEngine';
import Modal from '../components/ui/Modal';
import type { Task, TaskFrequency, TaskStatus } from '../domain/types';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Pendiente', in_progress: 'En progreso', completed: 'Completada', skipped: 'Omitida',
};
const STATUS_BADGE: Record<TaskStatus, string> = {
  pending: 'badge-amber', in_progress: 'badge-primary', completed: 'badge-green', skipped: 'badge-muted',
};

type TaskFormData = Omit<Task, 'id' | 'created_at' | 'updated_at'>;

function TaskForm({
  initial,
  familyId,
  members,
  onSave,
  onClose,
}: {
  initial?: Partial<Task>;
  familyId: string;
  members: { id: string; name: string; avatar_emoji: string }[];
  onSave: (data: TaskFormData) => void;
  onClose: () => void;
}) {
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [freq, setFreq] = useState<TaskFrequency>(initial?.frequency ?? 'daily');
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to ?? members[0]?.id ?? '');
  const [alarm, setAlarm] = useState(initial?.alarm_time ?? '');
  const [customDays, setCustomDays] = useState<number[]>(initial?.custom_days ?? []);

  const toggleDay = (d: number) =>
    setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !assignedTo) return;
    onSave({
      description: desc.trim(),
      frequency: freq,
      custom_days: freq === 'custom' ? customDays : undefined,
      assigned_to: assignedTo,
      alarm_time: alarm || undefined,
      status: initial?.status ?? 'pending',
      family_id: familyId,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="form-group">
        <label className="form-label">Descripción *</label>
        <input id="task-desc" className="form-input" value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="ej. Sacar la basura" required />
      </div>
      <div className="form-group">
        <label className="form-label">Frecuencia</label>
        <select id="task-freq" className="form-select" value={freq} onChange={e => setFreq(e.target.value as TaskFrequency)}>
          <option value="daily">Todos los días</option>
          <option value="weekly">Semanal (lunes)</option>
          <option value="custom">Días específicos</option>
        </select>
      </div>
      {freq === 'custom' && (
        <div className="form-group">
          <label className="form-label">Días</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {DAY_NAMES.map((d, i) => (
              <button type="button" key={i}
                onClick={() => toggleDay(i)}
                className={`filter-btn${customDays.includes(i) ? ' active' : ''}`}
                style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '0.78rem' }}
              >{d}</button>
            ))}
          </div>
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Asignado a *</label>
        <select id="task-assigned" className="form-select" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} required>
          {members.map(m => <option key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Hora de alarma (opcional)</label>
        <input id="task-alarm" type="time" className="form-input" value={alarm} onChange={e => setAlarm(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Guardar tarea</button>
      </div>
    </form>
  );
}

export default function TasksPage() {
  const { familyId, showToast } = useApp();
  const { currentMember, isAdmin } = useAuth();
  const { data: allTasks = [], isLoading } = useTasks(familyId);
  const { data: members = [] } = useMembers(familyId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const awardPoints = useAwardPoints();

  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | TaskStatus>('all');

  // Role-based: admins see all tasks; users see only their own
  const tasks = useMemo(
    () => isAdmin ? allTasks : allTasks.filter(t => t.assigned_to === currentMember?.id),
    [allTasks, isAdmin, currentMember]
  );

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filter === 'today') list = getTasksForToday(list);
    else if (filter !== 'all') list = list.filter(t => t.status === filter);
    return sortTasksByPriority(list);
  }, [tasks, filter]);

  const membersMap = useMemo(() =>
    members.reduce<Record<string, typeof members[0]>>((a, m) => { a[m.id] = m; return a; }, {}), [members]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const handleCreate = async (data: TaskFormData) => {
    try {
      await createTask.mutateAsync(data);
      setShowModal(false);
      showToast({ type: 'success', title: 'Tarea creada', message: data.description });
    } catch {
      showToast({ type: 'error', title: 'Error al crear tarea' });
    }
  };

  const handleEdit = async (data: TaskFormData) => {
    if (!editTask) return;
    try {
      await updateTask.mutateAsync({ ...data, id: editTask.id });
      setEditTask(null);
      showToast({ type: 'success', title: 'Tarea actualizada' });
    } catch {
      showToast({ type: 'error', title: 'Error al actualizar tarea' });
    }
  };

  const cycleStatus = async (task: Task) => {
    const next: Record<TaskStatus, TaskStatus> = {
      pending: 'in_progress', in_progress: 'completed', completed: 'pending', skipped: 'pending',
    };
    const nextStatus = next[task.status];
    try {
      await updateStatus.mutateAsync({ id: task.id, status: nextStatus, familyId: task.family_id });
      // Award points when completing a task
      if (nextStatus === 'completed' && task.assigned_to && familyId) {
        awardPoints.mutate({ memberId: task.assigned_to, familyId, points: 10 });
        showToast({ type: 'success', title: '🏆 +10 puntos', message: `Tarea "${task.description}" completada` });
      }
    } catch {
      showToast({ type: 'error', title: 'Error al actualizar' });
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`¿Eliminar "${task.description}"?`)) return;
    try {
      await deleteTask.mutateAsync({ id: task.id, familyId: task.family_id });
      showToast({ type: 'success', title: 'Tarea eliminada' });
    } catch {
      showToast({ type: 'error', title: 'Error al eliminar' });
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Domestic Engine</div>
          <div className="page-subtitle">{tasks.length} tareas · {tasks.filter(t => t.status === 'completed').length} completadas</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="new-task-btn">
            + Nueva Tarea
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="tasks-filters">
        {(['all', 'today', 'pending', 'in_progress', 'completed'] as const).map(f => (
          <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)} id={`filter-${f}`}>
            {f === 'all' ? 'Todas' : f === 'today' ? 'Hoy' : STATUS_LABEL[f as TaskStatus]}
          </button>
        ))}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>✓</div>
          <div>No hay tareas en esta vista</div>
        </div>
      ) : (
        <div className="tasks-grid">
          {filtered.map(task => {
            const member = membersMap[task.assigned_to];
            return (
              <div key={task.id} className="glass-card task-card">
                <span className={`status-dot ${task.status}`} />
                <div className="task-card-info">
                  <div className="task-card-name"
                    style={{
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      color: task.status === 'completed' ? 'var(--text-muted)' : undefined,
                    }}>
                    {task.description}
                  </div>
                  <div className="task-card-meta">
                    <span className={`badge ${STATUS_BADGE[task.status]}`}>{STATUS_LABEL[task.status]}</span>
                    <span className="badge badge-muted">🔁 {formatFrequency(task)}</span>
                    {member && <span className="badge badge-muted">{member.avatar_emoji} {member.name}</span>}
                    {task.alarm_time && <span className="badge badge-muted">⏰ {task.alarm_time}</span>}
                  </div>
                </div>
                <div className="task-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => cycleStatus(task)}
                    id={`task-status-${task.id}`} title="Cambiar estado">
                    {task.status === 'pending' ? '▶' : task.status === 'in_progress' ? '✓' : '↺'}
                  </button>
                  {isAdmin && (
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditTask(task)}
                      id={`task-edit-${task.id}`} title="Editar">✏️</button>
                  )}
                  {isAdmin && (
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(task)}
                      id={`task-delete-${task.id}`} title="Eliminar">✕</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <Modal title="Nueva Tarea" onClose={() => setShowModal(false)}>
          {members.length === 0 ? (
            <div style={{ color: 'var(--accent-amber)', fontSize: '0.875rem' }}>
              ⚠️ Primero agrega miembros a tu familia en la sección "Miembros".
            </div>
          ) : (
            <TaskForm
              familyId={familyId!}
              members={members}
              onSave={handleCreate}
              onClose={() => setShowModal(false)}
            />
          )}
        </Modal>
      )}

      {/* Edit Modal */}
      {editTask && familyId && (
        <Modal title="Editar Tarea" onClose={() => setEditTask(null)}>
          <TaskForm
            initial={editTask}
            familyId={familyId}
            members={members}
            onSave={handleEdit}
            onClose={() => setEditTask(null)}
          />
        </Modal>
      )}
    </>
  );
}
