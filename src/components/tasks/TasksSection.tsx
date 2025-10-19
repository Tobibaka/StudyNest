import { useMemo, useState, ChangeEvent, FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Task, type TaskCategory, type TaskPriority } from "@store/db";
import TopBar from "@components/TopBar";
import { addTask, updateTask, deleteTask } from "@store/taskService";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import classNames from "classnames";

const categories: TaskCategory[] = ["Study", "Assignment", "Exam"];
const priorities: TaskPriority[] = ["Low", "Medium", "High"];

const getISODate = (date: Date) => date.toISOString().split("T")[0];

const createCalendarGrid = (reference: Date) => {
  const startOfMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const endOfMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const totalDays = endOfMonth.getDate();

  const grid: Array<{ date: Date; currentMonth: boolean }> = [];

  for (let i = startDay - 1; i >= 0; i -= 1) {
    const date = new Date(startOfMonth);
    date.setDate(startOfMonth.getDate() - i - 1);
    grid.push({ date, currentMonth: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth(), day);
    grid.push({ date, currentMonth: true });
  }

  const remaining = 42 - grid.length;
  for (let i = 1; i <= remaining; i += 1) {
    const date = new Date(endOfMonth);
    date.setDate(endOfMonth.getDate() + i);
    grid.push({ date, currentMonth: false });
  }

  return grid;
};

const TasksSection = () => {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => getISODate(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState({
    title: "",
    category: "Study" as TaskCategory,
    dueTime: "",
    priority: "Medium" as TaskPriority,
    editingId: null as number | null
  });
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);

  const taskList = useLiveQuery<Task[]>(
    () => db.tasks.where({ date: selectedDate }).toArray(),
    [selectedDate]
  );

  const calendarGrid = useMemo(() => createCalendarGrid(month), [month]);
  const humanSelected = useMemo(() => new Date(selectedDate), [selectedDate]);

  const resetForm = () => {
    setFormState({ title: "", category: "Study", dueTime: "", priority: "Medium", editingId: null });
    setFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formState.editingId) {
      await updateTask(formState.editingId, {
        title: formState.title,
        category: formState.category,
        dueTime: formState.dueTime,
        priority: formState.priority
      });
    } else {
      await addTask({
        date: selectedDate,
        title: formState.title,
        category: formState.category,
        dueTime: formState.dueTime,
        priority: formState.priority
      });
    }
    resetForm();
  };

  const handleMarkComplete = async (task: Task) => {
    if (!task.id) return;
    await updateTask(task.id, { completed: !task.completed });
  };

  const openEditForm = (task: Task) => {
    setFormState({
      title: task.title,
      category: task.category,
      dueTime: task.dueTime ?? "",
      priority: task.priority,
      editingId: task.id ?? null
    });
    setFormOpen(true);
  };

  const handleConfirmDeleteTask = async () => {
    if (!confirmTask?.id) {
      setConfirmTask(null);
      return;
    }
    await deleteTask(confirmTask.id);
    setConfirmTask(null);
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <TopBar
        title="Tasks & Calendar"
        actionLabel={formOpen ? "Close" : "Add Task"}
        onAction={() => (formOpen ? resetForm() : setFormOpen(true))}
      />
      <div className="grid flex-1 gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-surface-muted/50 bg-surface-elevated/80 p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <button
              onClick={() =>
                setMonth((prev: Date) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="rounded-full border border-surface-muted/60 p-2 text-text-muted transition hover:text-primary"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-primary">
                {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-text-muted">Navigate to set your study goals</p>
            </div>
            <button
              onClick={() =>
                setMonth((prev: Date) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="rounded-full border border-surface-muted/60 p-2 text-text-muted transition hover:text-primary"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </header>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarGrid.map(({ date, currentMonth }) => {
              const iso = getISODate(date);
              const isSelected = iso === selectedDate;
              const hasTasks = (taskList ?? []).some((taskItem) => taskItem.date === iso);
              return (
                <button
                  key={iso + date.getTime()}
                  onClick={() => setSelectedDate(iso)}
                  className={classNames(
                    "flex h-12 flex-col items-center justify-center rounded-2xl border text-sm transition",
                    isSelected
                      ? "border-primary bg-primary/15 text-primary"
                      : currentMonth
                      ? "border-transparent bg-surface hover:border-primary/40"
                      : "border-transparent bg-surface-muted/30 text-text-muted"
                  )}
                >
                  <span>{date.getDate()}</span>
                  {hasTasks && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </section>
        <section className="flex flex-col gap-4 rounded-3xl border border-surface-muted/50 bg-surface-elevated/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text">
            {confirmTask && (
              <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-surface/40 backdrop-blur-sm"
                onClick={() => setConfirmTask(null)}
              >
                <div
                  className="w-full max-w-sm rounded-3xl border border-surface-muted/60 bg-surface-elevated/95 p-6 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    ARE YOU SURE YOU WANT TO DELETE?
                  </p>
                  <p className="mt-2 text-sm font-medium text-text">Task: {confirmTask.title}</p>
                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmTask(null)}
                      className="rounded-full border border-surface-muted/60 px-4 py-2 text-xs font-semibold text-text-muted transition hover:border-primary hover:text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteTask}
                      className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow shadow-red-500/40 transition hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
                {humanSelected.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric"
                })}
              </h3>
              <p className="text-xs text-text-muted">Keep tasks tidy and track what matters.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {(taskList ?? []).length} tasks
            </span>
          </div>
          {formOpen && (
            <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-surface-muted/60 bg-surface px-4 py-3">
              <input
                value={formState.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFormState((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Task title"
                className="rounded-2xl border border-surface-muted/60 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                required
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={formState.category}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setFormState((prev) => ({ ...prev, category: event.target.value as TaskCategory }))
                  }
                  className="rounded-2xl border border-surface-muted/60 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={formState.dueTime}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setFormState((prev) => ({ ...prev, dueTime: event.target.value }))
                  }
                  className="rounded-2xl border border-surface-muted/60 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <select
                  value={formState.priority}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setFormState((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))
                  }
                  className="rounded-2xl border border-surface-muted/60 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {priorities.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-surface-muted/60 px-4 py-2 text-sm text-text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow shadow-primary/40"
                >
                  {formState.editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          )}
          <div className="space-y-3 overflow-y-auto pr-1">
            {(taskList ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-muted/60 bg-surface px-5 py-6 text-center text-text-muted">
                No tasks scheduled for this day.
              </div>
            ) : (
              [...(taskList ?? [])]
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((task) => (
                  <article
                    key={task.id}
                    className={classNames(
                      "flex items-center justify-between rounded-2xl border border-surface-muted/60 bg-surface px-4 py-3 shadow-sm transition",
                      task.completed ? "opacity-60" : "opacity-100"
                    )}
                  >
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleMarkComplete(task)}
                        className="h-4 w-4 rounded border-surface-muted accent-primary"
                      />
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {task.title}
                          {task.dueTime && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              {task.dueTime}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted">
                          {task.category} • Priority {task.priority}
                        </p>
                      </div>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditForm(task)}
                        className="rounded-full border border-surface-muted/60 p-2 text-text-muted transition hover:text-primary"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => task.id && setConfirmTask(task)}
                        className="rounded-full border border-red-400/40 p-2 text-red-400 transition hover:bg-red-400/10"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TasksSection;
