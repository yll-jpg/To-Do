import { useEffect, useMemo, useState, type FormEvent, useCallback, type ChangeEvent } from "react";
import { useNavigate, BrowserRouter } from "react-router-dom"; 
// Requiere: npm install canvas-confetti
// Opcional para TS: npm install --save-dev @types/canvas-confetti
import confetti from "canvas-confetti"; 


import { api, setAuth } from '../api';
import './Dashboard.css';
import { getLocalTasks, setLocalTasks, getSyncQueue, addToSyncQueue, clearSyncQueue } from '../utils/storage';
import type { Task, FilterStatus } from '../types';




// Componente interno con la lógica (renombrado para envolverlo luego)
function DashboardContent() {
    const [tasks, setTasks] = useState<Task[]>(() => getLocalTasks());
    const [newTask, setNewTask] = useState({ title: '', description: '' });
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const navigate = useNavigate();

    // Sincronización
    const syncWithServer = useCallback(async () => {
        if (!navigator.onLine) return;
        
        const queue = getSyncQueue();
        if (queue.length === 0) return;

        try {
            const { data } = await api.post('/tasks/sync', { actions: queue });
            clearSyncQueue();
            
            // Actualizamos con la verdad del servidor
            setLocalTasks(data.tasks);
            setTasks(data.tasks);
            console.log("Sincronización completada.");
        } catch (error) { 
            console.error("Error en sincronización:", error); 
        }
    }, []);
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        setAuth(token);

        const loadInitialData = async () => {
            setLoading(true);
            try {
                const { data: serverTasks } = await api.get('/tasks');
                setTasks(serverTasks);
                setLocalTasks(serverTasks);
                await syncWithServer(); 
            } catch (error) {
                console.error("Usando datos locales por error de red/servidor.");
                setTasks(getLocalTasks());
            } finally {
                setLoading(false);
            }
        };
        
        loadInitialData();
        
        const handleOnline = () => { setIsOnline(true); syncWithServer(); };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [navigate, syncWithServer]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => !task.isDeleted)
                    .filter(task => filter === 'all' || task.status === filter)
                    .filter(task => 
                        task.title.toLowerCase().includes(search.toLowerCase()) || 
                        (task.description && task.description.toLowerCase().includes(search.toLowerCase()))
                    );
    }, [tasks, search, filter]);
    
    function handleFilterChange(e: ChangeEvent<HTMLSelectElement>) { setFilter(e.target.value as FilterStatus); }

    // --- EFECTO DE CONFETI (GAMIFICACIÓN) ---
    const triggerCelebration = () => {
        // Lanza confeti desde múltiples ángulos
        const count = 200;
        const defaults = { origin: { y: 0.7 } };

        function fire(particleRatio: number, opts: any) {
            if (typeof confetti === 'function') {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            }
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    };

    async function addTask(e: FormEvent) {
        e.preventDefault();
        const { title, description } = newTask;
        if (!title.trim()) return;
        
        const newTaskObject: Task = { 
            _id: `client-${crypto.randomUUID()}`, 
            title: title.trim(), 
            description: description.trim(), 
            status: 'Pending', 
            isDeleted: false 
        };
        
        const newTasks = [newTaskObject, ...tasks];
        updateTasksState(newTasks);
        addToSyncQueue({ type: 'create', payload: newTaskObject });
        setNewTask({ title: '', description: '' });
        
        // Intentar sincronizar inmediatamente
        syncWithServer();
    }

    async function toggleTaskStatus(task: Task) {
        const newStatus = (task.status === 'Pending' ? 'Completed' : 'Pending') as 'Pending' | 'Completed';
        
        // ¡Disparar confeti si se completa!
        if (newStatus === 'Completed') {
            triggerCelebration();
        }

        const updatedTask = { ...task, status: newStatus };
        const newTasks = tasks.map(t => t._id === task._id ? updatedTask : t);
        
        updateTasksState(newTasks);
        addToSyncQueue({ type: 'update', payload: { _id: task._id, status: newStatus } });
        syncWithServer();
    }
    
    async function saveEdit(e: FormEvent) {
        e.preventDefault();
        if (!editingTask || !editingTask.title.trim()) {
            if (editingTask) setEditingTask(null);
            return;
        }
        
        const taskToUpdate = { ...editingTask, title: editingTask.title.trim(), description: editingTask.description?.trim() || '' };
        const newTasks = tasks.map(t => t._id === taskToUpdate._id ? taskToUpdate : t);
        
        updateTasksState(newTasks);
        addToSyncQueue({ type: 'update', payload: { _id: taskToUpdate._id, title: taskToUpdate.title, description: taskToUpdate.description } });
        setEditingTask(null);
        syncWithServer();
    }

    async function deleteTask(id: string) {
        const newTasks = tasks.map(t => t._id === id ? { ...t, isDeleted: true } : t);
        updateTasksState(newTasks);
        addToSyncQueue({ type: 'delete', payload: { _id: id } });
        syncWithServer();
    }

    function updateTasksState(newTasks: Task[]) {
        setTasks(newTasks);
        setLocalTasks(newTasks);
    }
    
    function handleLogout() {
        localStorage.removeItem('token');
        setAuth(null);
        navigate('/login');
    }

    return (
        <div className="dashboard-container container">
           

            <header className="dashboard-header">
                <h1>Mis Tareas</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    
                    {/* Indicador de Wi-Fi */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '50px',
                        backgroundColor: isOnline ? '#E8F5E9' : '#FFEBEE', 
                        color: isOnline ? '#2E7D32' : '#C62828',
                        fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.3s ease', 
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}>
                        {isOnline ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.64 9.14a15 15 0 0 1 20.72 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                        )}
                        <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
                    </div>

                    <button onClick={handleLogout} className="btn btn-secondary">Cerrar Sesión</button>
                </div>
            </header>
            
            <form onSubmit={addTask} className="task-controls add-task-form">
                <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Título de la nueva tarea" />
                <input value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Descripción (opcional)" />
                <button type="submit" className="btn btn-primary">Añadir Tarea</button>
            </form>

            <div className="task-controls">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en título o descripción..." />
                <select value={filter} onChange={handleFilterChange}>
                    <option value="all">Todas</option>
                    <option value="Pending">Pendientes</option>
                    <option value="Completed">Completadas</option>
                </select>
            </div>
            
            {loading ? <p style={{textAlign: 'center', color: '#90A4AE'}}>Cargando tus tareas...</p> : (
                <div className="task-list">
                    {filteredTasks.length > 0 ? filteredTasks.map(task => (
                        <div key={task._id} className={`task-item ${task.status === 'Completed' ? 'completed' : ''} ${task._id.startsWith('client-') ? 'unsynced' : ''}`}>
                            {editingTask?._id === task._id ? (
                                <form onSubmit={saveEdit} className="task-form-edit">
                                    <input value={editingTask.title} onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} className="task-input-edit" autoFocus />
                                    <textarea value={editingTask.description || ''} onChange={e => setEditingTask({ ...editingTask, description: e.target.value })} className="task-input-edit" placeholder="Descripción" />
                                    <div className="task-actions">
                                        <button type="submit" className="btn btn-primary">Guardar</button>
                                        <button type="button" onClick={() => setEditingTask(null)} className="btn btn-secondary">Cancelar</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    {/* Icono Visual "Grip" (simula Drag & Drop) */}
                                    <div style={{cursor: 'grab', color: '#CFD8DC', marginRight: '15px', display: 'flex', flexDirection: 'column', gap: '3px', padding: '5px'}}>
                                        <div style={{display:'flex', gap:'3px'}}>
                                            <div style={{width:'4px', height:'4px', borderRadius:'50%', background:'currentColor'}}></div>
                                            <div style={{width:'4px', height:'4px', borderRadius:'50%', background:'currentColor'}}></div>
                                        </div>
                                        <div style={{display:'flex', gap:'3px'}}>
                                            <div style={{width:'4px', height:'4px', borderRadius:'50%', background:'currentColor'}}></div>
                                            <div style={{width:'4px', height:'4px', borderRadius:'50%', background:'currentColor'}}></div>
                                        </div>
                                        <div style={{display:'flex', gap:'3px'}}>
                                            <div style={{width:'4px', height:'4px', borderRadius:'50%', background:'currentColor'}}></div>
                                            <div style={{width:'4px', height:'4px', borderRadius:'50%', background:'currentColor'}}></div>
                                        </div>
                                    </div>

                                    <div className="task-content">
                                        <input type="checkbox" checked={task.status === 'Completed'} onChange={() => toggleTaskStatus(task)} />
                                        <div>
                                            <h2 className="task-title">{task.title}</h2>
                                            <p className="task-description">{task.description}</p>
                                        </div>
                                    </div>
                                    <div className="task-actions">
                                        <button onClick={() => setEditingTask(task)} className="btn btn-secondary">Editar</button>
                                        <button onClick={() => deleteTask(task._id)} className="btn btn-primary">Eliminar</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )) : (
                        <div className="no-tasks">
                            <p>¡Felicidades! No tienes tareas pendientes.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Envolvemos el componente en Router SOLO para la vista previa.
export default function Dashboard() {
    return (
        
            <DashboardContent />
       
    );
}