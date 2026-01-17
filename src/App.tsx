import { useState, useEffect, useCallback } from 'react'

// Types
type Energy = 'low' | 'medium' | 'high'

type ProjectStatus = 'Planning' | 'Building' | 'Shipping' | 'Paused'

type Project = {
  id: string
  name: string
  goal: string
}

type Task = {
  id: string
  projectId: string
  text: string
  completed: boolean
  nextAction?: string
  createdAt: number
}

type Log = {
  id: string
  timestamp: string
  projectId: string
  energy: Energy
  text: string
}

type DailyBrief = {
  mission: string
  actions: string[]
  risk: string
  shutdownRule: string
  generatedAt: string
}

type ExportData = {
  exportedAt: string
  selectedProjectId: string
  energy: Energy
  projects: Project[]
  tasks: Task[]
  logs: Log[]
  projectStatuses?: Record<string, ProjectStatus>
}

// Default projects
const DEFAULT_PROJECTS: Project[] = [
  { id: 'ark-engine', name: 'Ark Engine', goal: 'Build a personal productivity command center' },
  { id: 'amanuel-travel', name: 'Amanuel Travel', goal: 'Plan and execute travel adventures' },
  { id: 'signalcrypt', name: 'SignalCrypt', goal: 'Secure communication platform' },
  { id: 'strong-still', name: 'Strong & Still', goal: 'Fitness and wellness journey' },
]

// Helper functions
const safeJSONParse = <T,>(json: string | null, defaultValue: T): T => {
  if (!json) return defaultValue
  try {
    return JSON.parse(json) as T
  } catch {
    return defaultValue
  }
}

const uid = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const downloadJSON = (data: ExportData, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// localStorage keys
const STORAGE_KEYS = {
  projects: 'ark_projects_v1',
  tasks: 'ark_tasks_v1',
  logs: 'ark_logs_v1',
  settings: 'ark_settings_v1',
  brief: 'ark_brief_v1',
  projectStatuses: 'ark_project_status_v1',
  streak: 'ark_streak_v1',
}

function App() {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(DEFAULT_PROJECTS[0].id)
  const [energy, setEnergy] = useState<Energy>('medium')
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [newTaskText, setNewTaskText] = useState('')
  const [logText, setLogText] = useState('')
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null)
  const [editingNextAction, setEditingNextAction] = useState<string | null>(null)
  const [nextActionInputs, setNextActionInputs] = useState<Record<string, string>>({})
  const [projectStatuses, setProjectStatuses] = useState<Record<string, ProjectStatus>>({})

  // Load data from localStorage on mount
  useEffect(() => {
    const storedProjects = safeJSONParse<Project[]>(localStorage.getItem(STORAGE_KEYS.projects), DEFAULT_PROJECTS)
    const storedTasks = safeJSONParse<Task[]>(localStorage.getItem(STORAGE_KEYS.tasks), [])
    const storedLogs = safeJSONParse<Log[]>(localStorage.getItem(STORAGE_KEYS.logs), [])
    const storedSettings = safeJSONParse<{ projectId: string; energy: Energy }>(
      localStorage.getItem(STORAGE_KEYS.settings),
      { projectId: DEFAULT_PROJECTS[0].id, energy: 'medium' }
    )
    const storedBrief = safeJSONParse<DailyBrief | null>(localStorage.getItem(STORAGE_KEYS.brief), null)
    const storedStatuses = safeJSONParse<Record<string, ProjectStatus>>(
      localStorage.getItem(STORAGE_KEYS.projectStatuses),
      {}
    )

    setProjects(storedProjects)
    setTasks(storedTasks)
    setLogs(storedLogs)
    setSelectedProjectId(storedSettings.projectId)
    setEnergy(storedSettings.energy)
    setProjectStatuses(storedStatuses)
    if (storedBrief) {
      setDailyBrief(storedBrief)
    }
  }, [])

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks))
  }, [tasks])

  // Save logs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(logs))
  }, [logs])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ projectId: selectedProjectId, energy }))
  }, [selectedProjectId, energy])

  // Save brief to localStorage
  useEffect(() => {
    if (dailyBrief) {
      localStorage.setItem(STORAGE_KEYS.brief, JSON.stringify(dailyBrief))
    }
  }, [dailyBrief])

  // Save project statuses to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.projectStatuses, JSON.stringify(projectStatuses))
  }, [projectStatuses])

  // Get tasks for current project
  const currentProjectTasks = tasks.filter(t => t.projectId === selectedProjectId)
  const openTasks = currentProjectTasks.filter(t => !t.completed).sort((a, b) => b.createdAt - a.createdAt)
  const top3Tasks = openTasks.slice(0, 3)

  // Get logs for current project
  const currentProjectLogs = logs
    .filter(l => l.projectId === selectedProjectId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)

  // Get current project status (default to Planning)
  const currentProjectStatus = projectStatuses[selectedProjectId] || 'Planning'
  const isProjectPaused = currentProjectStatus === 'Paused'

  // Helper: get local date string (YYYY-MM-DD) from ISO timestamp
  const getLocalDateString = (isoTimestamp: string): string => {
    const date = new Date(isoTimestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Compute 7-day heatmap and streaks
  const computeStreakData = () => {
    // Get all unique dates that have logs (using local time)
    const logDates = new Set<string>()
    logs.forEach(log => {
      const dateStr = getLocalDateString(log.timestamp)
      logDates.add(dateStr)
    })

    // Generate last 7 days (today + previous 6 days)
    const today = new Date()
    const sevenDays: Array<{ date: Date; dateStr: string; hasLog: boolean }> = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      sevenDays.unshift({ date, dateStr, hasLog: logDates.has(dateStr) })
    }

    // Compute current streak (consecutive days from today backwards with at least 1 log)
    let currentStreak = 0
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      if (logDates.has(dateStr)) {
        currentStreak++
      } else {
        break
      }
    }

    // Compute best streak from all logs
    const allDates = Array.from(logDates).sort()
    let bestStreak = 0
    let currentBestStreak = 0
    let prevDate: Date | null = null

    allDates.forEach(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)

      if (prevDate === null) {
        currentBestStreak = 1
      } else {
        const diffDays = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          currentBestStreak++
        } else {
          bestStreak = Math.max(bestStreak, currentBestStreak)
          currentBestStreak = 1
        }
      }
      prevDate = date
    })
    bestStreak = Math.max(bestStreak, currentBestStreak)

    return { sevenDays, currentStreak, bestStreak }
  }

  const { sevenDays, currentStreak, bestStreak } = computeStreakData()

  // Format date for display (e.g., "Jan 17")
  const formatDateShort = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  // Add task
  const handleAddTask = () => {
    if (!newTaskText.trim() || isProjectPaused) return
    const newTask: Task = {
      id: uid(),
      projectId: selectedProjectId,
      text: newTaskText.trim(),
      completed: false,
      createdAt: Date.now(),
    }
    setTasks([...tasks, newTask])
    setNewTaskText('')
  }

  // Toggle task completion
  const handleToggleTask = (taskId: string) => {
    if (isProjectPaused) return
    setTasks(tasks.map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t)))
  }

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    if (isProjectPaused) return
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  // Clear completed tasks
  const handleClearCompleted = () => {
    if (isProjectPaused) return
    setTasks(tasks.filter(t => !(t.projectId === selectedProjectId && t.completed)))
  }

  // Focus mode: keep only top 3 open tasks
  const handleFocusMode = () => {
    if (isProjectPaused) return
    const tasksToKeep = top3Tasks.map(t => t.id)
    setTasks(
      tasks.filter(t => {
        if (t.projectId !== selectedProjectId) return true
        if (!t.completed) return tasksToKeep.includes(t.id)
        return false
      })
    )
  }

  // Update task nextAction
  const handleUpdateNextAction = (taskId: string, nextAction: string) => {
    if (isProjectPaused) return
    setTasks(tasks.map(t => (t.id === taskId ? { ...t, nextAction: nextAction.trim() || undefined } : t)))
    setEditingNextAction(null)
    setNextActionInputs({ ...nextActionInputs, [taskId]: '' })
  }

  // Save log
  const handleSaveLog = () => {
    if (!logText.trim() || isProjectPaused) return
    const newLog: Log = {
      id: uid(),
      timestamp: new Date().toISOString(),
      projectId: selectedProjectId,
      energy,
      text: logText.trim(),
    }
    setLogs([newLog, ...logs])
    setLogText('')
  }

  // Update project status
  const handleUpdateProjectStatus = (projectId: string, status: ProjectStatus) => {
    setProjectStatuses({ ...projectStatuses, [projectId]: status })
  }

  // Copy latest log
  const handleCopyLatestLog = () => {
    if (currentProjectLogs.length === 0) return
    const latestLog = currentProjectLogs[0]
    const text = `[${latestLog.timestamp}] ${latestLog.text}`
    navigator.clipboard.writeText(text)
  }

  // Generate daily plan
  const generateDailyPlan = (): string[] => {
    const plan: string[] = []
    
    if (energy === 'high') {
      plan.push('1. Start with the most challenging task')
      if (top3Tasks.length > 0) {
        plan.push(`2. ${top3Tasks[0].text}${top3Tasks[0].nextAction ? ` - ${top3Tasks[0].nextAction}` : ''}`)
      }
      if (top3Tasks.length > 1) {
        plan.push(`3. ${top3Tasks[1].text}${top3Tasks[1].nextAction ? ` - ${top3Tasks[1].nextAction}` : ''}`)
      }
      if (top3Tasks.length > 2) {
        plan.push(`4. ${top3Tasks[2].text}${top3Tasks[2].nextAction ? ` - ${top3Tasks[2].nextAction}` : ''}`)
      }
    } else if (energy === 'medium') {
      if (top3Tasks.length > 0) {
        plan.push(`1. ${top3Tasks[0].text}${top3Tasks[0].nextAction ? ` - ${top3Tasks[0].nextAction}` : ''}`)
      }
      if (top3Tasks.length > 1) {
        plan.push(`2. ${top3Tasks[1].text}${top3Tasks[1].nextAction ? ` - ${top3Tasks[1].nextAction}` : ''}`)
      }
      plan.push('3. Take a break')
      if (top3Tasks.length > 2) {
        plan.push(`4. ${top3Tasks[2].text}${top3Tasks[2].nextAction ? ` - ${top3Tasks[2].nextAction}` : ''}`)
      }
    } else {
      plan.push('1. Start with the smallest task')
      if (top3Tasks.length > 0) {
        plan.push(`2. ${top3Tasks[0].text}${top3Tasks[0].nextAction ? ` - ${top3Tasks[0].nextAction}` : ''}`)
      }
      plan.push('3. Rest and recharge')
      if (top3Tasks.length > 1) {
        plan.push(`4. ${top3Tasks[1].text}${top3Tasks[1].nextAction ? ` - ${top3Tasks[1].nextAction}` : ''}`)
      }
    }
    
    return plan
  }

  const dailyPlan = generateDailyPlan()

  // Generate daily brief
  const handleGenerateBrief = () => {
    const selectedProject = projects.find(p => p.id === selectedProjectId)
    if (!selectedProject) return

    const mission = `Today's mission: ${selectedProject.goal}`
    
    const actions: string[] = []
    top3Tasks.forEach((task, idx) => {
      const actionText = task.nextAction ? `${task.text} - ${task.nextAction}` : task.text
      actions.push(`${idx + 1}. ${actionText}`)
    })

    let risk = ''
    if (energy === 'low') {
      risk = "Risk to avoid today: Overcommitting and burning out. Keep it simple and sustainable."
    } else if (energy === 'high') {
      risk = "Risk to avoid today: Rushing through tasks without proper attention to quality."
    } else {
      risk = "Risk to avoid today: Getting distracted by low-priority tasks instead of focusing on what matters."
    }

    const shutdownRule = energy === 'high' 
      ? "Done looks like: All three top tasks completed or moved forward significantly."
      : energy === 'medium'
      ? "Done looks like: At least two top tasks completed and feeling good about progress."
      : "Done looks like: One top task completed and energy preserved for tomorrow."

    const brief: DailyBrief = {
      mission,
      actions,
      risk,
      shutdownRule,
      generatedAt: new Date().toISOString(),
    }

    setDailyBrief(brief)
  }

  // Export everything
  const handleExport = () => {
    const exportData: ExportData = {
      exportedAt: new Date().toISOString(),
      selectedProjectId,
      energy,
      projects,
      tasks,
      logs,
      projectStatuses,
    }
    downloadJSON(exportData, `ark-engine-export-${Date.now()}.json`)
  }

  // Import JSON
  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string) as ExportData

          // Validate minimal shape
          if (!data.tasks || !Array.isArray(data.tasks)) {
            alert('Invalid import file: missing or invalid tasks array')
            return
          }
          if (!data.logs || !Array.isArray(data.logs)) {
            alert('Invalid import file: missing or invalid logs array')
            return
          }

          // Restore data
          if (data.energy) setEnergy(data.energy)
          if (data.selectedProjectId) setSelectedProjectId(data.selectedProjectId)
          if (data.tasks) setTasks(data.tasks)
          if (data.logs) setLogs(data.logs)
          if (data.projects) setProjects(data.projects)
          // Restore project statuses if present, otherwise keep existing
          if (data.projectStatuses) {
            setProjectStatuses(data.projectStatuses)
          }

          alert('Data imported successfully!')
        } catch (error) {
          alert('Failed to parse import file. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f6f7f9', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>Ark Engine Command Center</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Export Everything (JSON)
          </button>
          <button
            onClick={handleImport}
            style={{
              padding: '10px 20px',
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Import JSON
          </button>
        </div>
      </div>

      {/* Momentum Card */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ marginTop: '0', fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: '#111827' }}>Momentum</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          {/* 7-Day Heatmap */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {sevenDays.map((day) => (
              <div
                key={day.dateStr}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: day.hasLog ? '#16a34a' : '#e5e7eb',
                    borderRadius: '6px',
                    border: day.hasLog ? 'none' : '1px solid #e5e7eb',
                  }}
                />
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>{formatDateShort(day.date)}</div>
              </div>
            ))}
          </div>
          {/* Streak Stats */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Current Streak</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>{currentStreak}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Best Streak</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>{bestStreak}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Project</label>
            {isProjectPaused && (
              <span
                style={{
                  padding: '3px 10px',
                  background: '#f59e0b',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                }}
              >
                PAUSED
              </span>
            )}
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ 
              padding: '10px 14px', 
              fontSize: '14px', 
              minWidth: '200px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#111827',
              cursor: 'pointer',
            }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Status</label>
          <select
            value={currentProjectStatus}
            onChange={(e) => handleUpdateProjectStatus(selectedProjectId, e.target.value as ProjectStatus)}
            style={{ 
              padding: '10px 14px', 
              fontSize: '14px', 
              minWidth: '150px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#111827',
              cursor: 'pointer',
            }}
          >
            <option value="Planning">Planning</option>
            <option value="Building">Building</option>
            <option value="Shipping">Shipping</option>
            <option value="Paused">Paused</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Energy</label>
          <select
            value={energy}
            onChange={(e) => setEnergy(e.target.value as Energy)}
            style={{ 
              padding: '10px 14px', 
              fontSize: '14px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#111827',
              cursor: 'pointer',
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button
          onClick={handleGenerateBrief}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Generate Daily Brief
        </button>
      </div>

      {/* Daily Brief */}
      {dailyBrief && (
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ marginTop: '0', fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: '#111827' }}>Daily Brief</h2>
          <p style={{ margin: '12px 0', lineHeight: '1.6', color: '#111827' }}><strong style={{ color: '#111827' }}>Mission:</strong> {dailyBrief.mission}</p>
          <div style={{ margin: '12px 0' }}>
            <strong style={{ color: '#111827' }}>Top 3 Actions:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '24px' }}>
              {dailyBrief.actions.map((action, idx) => (
                <li key={idx} style={{ margin: '6px 0', lineHeight: '1.6', color: '#111827' }}>{action}</li>
              ))}
            </ul>
          </div>
          <p style={{ margin: '12px 0', lineHeight: '1.6', color: '#111827' }}><strong style={{ color: '#111827' }}>Risk:</strong> {dailyBrief.risk}</p>
          <p style={{ margin: '12px 0', lineHeight: '1.6', color: '#111827' }}><strong style={{ color: '#111827' }}>Shutdown Rule:</strong> {dailyBrief.shutdownRule}</p>
        </div>
      )}

      {/* Today's Plan */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ marginTop: '0', fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: '#111827' }}>Today's Plan</h2>
        {dailyPlan.length > 0 ? (
          <ol style={{ margin: '0', paddingLeft: '24px', lineHeight: '1.8' }}>
            {dailyPlan.map((item, idx) => (
              <li key={idx} style={{ margin: '8px 0', color: '#111827' }}>{item}</li>
            ))}
          </ol>
        ) : (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Add tasks to generate a plan</p>
        )}
      </div>

      {/* Two Columns: Tasks and Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Tasks Column */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', marginTop: '0', marginBottom: '16px', fontWeight: '600', color: '#111827' }}>Tasks</h2>
          
          {/* Add Task */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder={isProjectPaused ? "Project is paused - cannot add tasks" : "New task..."}
              disabled={isProjectPaused}
              style={{
                flex: '1',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: isProjectPaused ? '#f3f4f6' : '#ffffff',
                color: isProjectPaused ? '#6b7280' : '#111827',
                opacity: isProjectPaused ? 0.6 : 1,
                cursor: isProjectPaused ? 'not-allowed' : 'text',
              }}
            />
            <button
              onClick={handleAddTask}
              disabled={isProjectPaused}
              style={{
                padding: '10px 20px',
                background: isProjectPaused ? '#e5e7eb' : '#2563eb',
                color: isProjectPaused ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isProjectPaused ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Add
            </button>
          </div>

          {/* Task Actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={handleClearCompleted}
              disabled={isProjectPaused}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                color: isProjectPaused ? '#9ca3af' : '#111827',
                border: `1px solid ${isProjectPaused ? '#e5e7eb' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: isProjectPaused ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Clear Completed
            </button>
            <button
              onClick={handleFocusMode}
              disabled={isProjectPaused}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                color: isProjectPaused ? '#9ca3af' : '#111827',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: isProjectPaused ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Focus Mode (Top 3)
            </button>
          </div>

          {/* Task List */}
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {currentProjectTasks.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No tasks yet. Add one above.</p>
            ) : (
              currentProjectTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: task.completed ? '#f9fafb' : '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      disabled={isProjectPaused}
                      style={{ marginTop: '4px', cursor: isProjectPaused ? 'not-allowed' : 'pointer', width: '18px', height: '18px' }}
                    />
                    <span
                      style={{
                        flex: '1',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? '#9ca3af' : '#111827',
                        lineHeight: '1.5',
                      }}
                    >
                      {task.text}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={isProjectPaused}
                      style={{
                        background: 'none',
                        color: isProjectPaused ? '#9ca3af' : '#dc2626',
                        border: `1px solid ${isProjectPaused ? '#e5e7eb' : '#dc2626'}`,
                        borderRadius: '6px',
                        padding: '6px 12px',
                        cursor: isProjectPaused ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  {editingNextAction === task.id ? (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '30px' }}>
                      <input
                        type="text"
                        value={nextActionInputs[task.id] || task.nextAction || ''}
                        onChange={(e) => setNextActionInputs({ ...nextActionInputs, [task.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateNextAction(task.id, nextActionInputs[task.id] || '')
                          } else if (e.key === 'Escape') {
                            setEditingNextAction(null)
                          }
                        }}
                        placeholder="Next action..."
                        autoFocus
                        style={{
                          flex: '1',
                          padding: '8px 12px',
                          fontSize: '13px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          color: '#111827',
                        }}
                      />
                      <button
                        onClick={() => handleUpdateNextAction(task.id, nextActionInputs[task.id] || '')}
                        style={{
                          padding: '8px 16px',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginLeft: '30px', fontSize: '13px' }}>
                      {task.nextAction ? (
                        <span style={{ color: '#6b7280' }}>
                          <strong style={{ color: '#111827' }}>Next:</strong> {task.nextAction}
                          {!isProjectPaused && (
                            <button
                              onClick={() => {
                                setEditingNextAction(task.id)
                                setNextActionInputs({ ...nextActionInputs, [task.id]: task.nextAction || '' })
                              }}
                              style={{
                                marginLeft: '8px',
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                fontSize: '12px',
                                textDecoration: 'underline',
                                fontWeight: '500',
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (!isProjectPaused) {
                              setEditingNextAction(task.id)
                              setNextActionInputs({ ...nextActionInputs, [task.id]: '' })
                            }
                          }}
                          disabled={isProjectPaused}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isProjectPaused ? '#9ca3af' : '#2563eb',
                            cursor: isProjectPaused ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            textDecoration: isProjectPaused ? 'none' : 'underline',
                            fontWeight: '500',
                          }}
                        >
                          + Next action...
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logs Column */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', marginTop: '0', marginBottom: '16px', fontWeight: '600', color: '#111827' }}>Daily Logs</h2>
          
          {/* New Log */}
          <div style={{ marginBottom: '16px' }}>
            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder={isProjectPaused ? "Project is paused - cannot save logs" : "What did you ship? What's the next step?"}
              disabled={isProjectPaused}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
                backgroundColor: isProjectPaused ? '#f3f4f6' : '#ffffff',
                color: isProjectPaused ? '#6b7280' : '#111827',
                opacity: isProjectPaused ? 0.6 : 1,
                cursor: isProjectPaused ? 'not-allowed' : 'text',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={handleSaveLog}
                disabled={isProjectPaused}
                style={{
                  padding: '10px 20px',
                  background: isProjectPaused ? '#e5e7eb' : '#2563eb',
                  color: isProjectPaused ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isProjectPaused ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Save Log
              </button>
              <button
                onClick={handleCopyLatestLog}
                disabled={currentProjectLogs.length === 0}
                style={{
                  padding: '10px 20px',
                  background: currentProjectLogs.length === 0 ? '#e5e7eb' : '#ffffff',
                  color: currentProjectLogs.length === 0 ? '#9ca3af' : '#111827',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: currentProjectLogs.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Copy Latest Log
              </button>
            </div>
          </div>

          {/* Log List */}
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {currentProjectLogs.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No logs yet. Write one above.</p>
            ) : (
              currentProjectLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
                    {new Date(log.timestamp).toLocaleString()} • {log.energy}
                  </div>
                  <div style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#111827' }}>{log.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
