import { useState, useEffect, useCallback } from 'react'

// Types
type Energy = 'low' | 'medium' | 'high'

type ProjectStateStatus = 'Planning' | 'Building' | 'Shipping' | 'Maintenance' | 'Paused'

type ProjectCategory = 'Sacred' | 'Commercial'

type WorkMode = 'dev' | 'sales' | 'content'

type WorkModeOutput = {
  mode: WorkMode
  text: string
  createdAt: number
}

type Project = {
  id: string
  name: string
  goal: string
  category: ProjectCategory
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

type ProjectState = {
  stage: ProjectStateStatus
  blockers: string
  nextCheckpoint: string
}

type ProjectLedger = {
  mission: string
  oneSentenceGoal: string
  currentReality: string
  whatIsDone: string
  whatIsWorking: string
  whatIsBroken: string
  whatIsMissing: string
  assets: string
  constraints: string
  nextFocus: string
  killCriteria: string
  automationStatus: string
  confidenceScore: number | null
  lastUpdated: string
}

type Milestone = {
  id: string
  projectId: string
  text: string
  done: boolean
  createdAt: number
}

type ExportData = {
  exportedAt: string
  selectedProjectId: string
  energy: Energy
  projects: Project[]
  tasks: Task[]
  logs: Log[]
  workMode?: WorkMode
  workModeOutputs?: Record<string, WorkModeOutput>
  projectState?: Record<string, ProjectState>
  milestones?: Milestone[]
  projectLedger?: Record<string, ProjectLedger>
  outreachAgentSpec?: string
  projectStatuses?: Record<string, ProjectStateStatus>
}

// --- SignalCrypt Weekly Batch (Approval-Gated) ---
type SignalCryptBatch = {
  batchId: string;
  preparedAt: string;
  limits: { email: number; dm: number };
  discoveryRule: string;
  offer: { name: string; price: string };
  angle: string;
  targets: Array<{
    name: string;
    website: string;
    whySelected: string;
    channel: string;
    email: string;
    dmHandle: string;
    notes: string;
  }>;
  email: { subjectA: string; body1: string; body2: string; followUpDelayDays: number };
  dm: { message: string; maxTargets: number; eligibilityRule: string };
  executionPlan: { schedule: Array<{ day: string; action: string }>; stopConditions: string[] };
  risks: string[];
  safeguards: string[];
  approval: { status: "PENDING" | "APPROVED" | "REJECTED"; approvedBy: string; approvedAt: string };
};

const SC_BATCH_KEY = "ark_signalcrypt_batch_v1";
const SC_OUTREACH_SPEC_KEY = "ark_signalcrypt_outreach_spec_v1";

const SIGNALCRYPT_OUTREACH_SPEC_V1 = `{
  "agentId": "signalcrypt_outreach_v1",
  "status": "DRAFT",
  "projectId": "signalcrypt",
  "mode": "approval_gated_autonomy",
  "cadence": {
    "type": "weekly",
    "day": "Sunday",
    "timeLocal": "09:00",
    "timezone": "America/Toronto"
  },
  "channels": {
    "primary": "email",
    "senderIdentity": "SignalCrypt",
    "dm": {
      "enabled": false,
      "maxPerBatch": 3,
      "rule": "only after email sequence OR dm-first qualification"
    }
  },
  "limits": {
    "emailsPerBatch": 15,
    "followUpDelayDays": 4,
    "maxFollowUps": 1
  },
  "discovery": {
    "source": "public_web",
    "icp": {
      "region": "North America",
      "companyType": "B2B SaaS",
      "employeeRange": "10-200",
      "mustHaveClaims": ["security", "trust", "privacy", "compliance", "uptime"]
    },
    "evidenceRequired": true,
    "outputFields": ["name", "website", "whySelected", "evidenceUrl"]
  },
  "approval": {
    "required": true,
    "who": "Yonatan",
    "states": ["PENDING", "APPROVED", "REJECTED", "PAUSED"]
  },
  "stopConditions": ["any_reply", "unsubscribe", "bounce", "manual_pause"],
  "logging": {
    "required": true,
    "logTo": "ark_engine",
    "fields": ["target", "channel", "step", "timestamp", "result"]
  },
  "gmail": {
    "accountType": "personal",
    "integration": "oauth",
    "dryRun": true,
    "draftsMode": "GMAIL_DRAFTS"
  }
}`;

function loadSignalCryptBatch(): SignalCryptBatch | null {
  try {
    const raw = localStorage.getItem(SC_BATCH_KEY);
    return raw ? (JSON.parse(raw) as SignalCryptBatch) : null;
  } catch {
    return null;
  }
}

function saveSignalCryptBatch(batch: SignalCryptBatch) {
  localStorage.setItem(SC_BATCH_KEY, JSON.stringify(batch));
}

function loadSignalCryptOutreachSpec(): string {
  try {
    return localStorage.getItem(SC_OUTREACH_SPEC_KEY) || SIGNALCRYPT_OUTREACH_SPEC_V1
  } catch {
    return SIGNALCRYPT_OUTREACH_SPEC_V1
  }
}

function saveSignalCryptOutreachSpec(spec: string) {
  localStorage.setItem(SC_OUTREACH_SPEC_KEY, spec)
}

// Default projects
const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'ark-engine',
    name: 'Ark Engine (Core)',
    goal: 'The command center that tracks truth, progress, and decisions.',
    category: 'Commercial',
  },
  {
    id: 'amanuel-travel',
    name: 'ATA - Amanuel Travel Agency',
    goal: 'Travel website and booking system for Eritrean/diaspora travelers.',
    category: 'Commercial',
  },
  {
    id: 'signalcrypt',
    name: 'SignalCrypt',
    goal: 'B2B security / trust audit offer with approval-gated outbound systems.',
    category: 'Commercial',
  },
  {
    id: 'strong-still',
    name: 'Strong & Still',
    goal: 'Ministry, devotionals, books, spiritual writing, and faith-based rebuilding.',
    category: 'Sacred',
  },
  {
    id: 'luxury-pet',
    name: 'Luxury Pet Business',
    goal: 'High-end pet adventures and services.',
    category: 'Commercial',
  },
  {
    id: 'surplus',
    name: 'Surplus Data / Surplus Properties',
    goal: 'Identify surplus or public assets and match buyers intelligently.',
    category: 'Commercial',
  },
  {
    id: 'cik-workforce',
    name: 'CIK Workforce System',
    goal: 'Workforce management and automation for construction/field teams.',
    category: 'Commercial',
  },
  {
    id: 'ndc-iata',
    name: 'NDC / IATA Airline System',
    goal: 'Research and future platform for modern airline distribution and APIs.',
    category: 'Commercial',
  },
  {
    id: 'rebuild-nation',
    name: 'Rebuild Nation',
    goal: 'Umbrella identity and long-term legacy mission.',
    category: 'Sacred',
  },
  {
    id: 'automation-workflows',
    name: 'Automation Workflows & Agents',
    goal: 'Supporting systems that reduce manual effort across projects.',
    category: 'Commercial',
  },
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

const mergeProjects = (storedProjects: Project[]): Project[] => {
  const defaultsById = new Map(DEFAULT_PROJECTS.map(project => [project.id, project]))
  const merged = storedProjects.map(project => {
    const defaults = defaultsById.get(project.id)
    if (!defaults) return project
    return {
      ...defaults,
      ...project,
      goal: project.goal || defaults.goal,
      name: project.name || defaults.name,
      category: project.category || defaults.category,
    }
  })

  DEFAULT_PROJECTS.forEach(project => {
    if (!merged.some(existing => existing.id === project.id)) {
      merged.push(project)
    }
  })

  return merged
}

const createDefaultProjectState = (): Record<string, ProjectState> => {
  return DEFAULT_PROJECTS.reduce<Record<string, ProjectState>>((acc, project) => {
    acc[project.id] = {
      stage: 'Planning',
      blockers: '',
      nextCheckpoint: '',
    }
    return acc
  }, {})
}

const createDefaultProjectLedger = (): Record<string, ProjectLedger> => {
  return DEFAULT_PROJECTS.reduce<Record<string, ProjectLedger>>((acc, project) => {
    acc[project.id] = {
      mission: '',
      oneSentenceGoal: project.goal,
      currentReality: '',
      whatIsDone: '',
      whatIsWorking: '',
      whatIsBroken: '',
      whatIsMissing: '',
      assets: '',
      constraints: '',
      nextFocus: '',
      killCriteria: '',
      automationStatus: '',
      confidenceScore: null,
      lastUpdated: '',
    }
    return acc
  }, {})
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
  streak: 'ark_streak_v1',
  workMode: 'ark_workmode_v1',
  workModeOutputs: 'ark_workmode_output_v1',
  projectState: 'ark_project_state_v1',
  milestones: 'ark_milestones_v1',
  projectLedger: 'ark_project_ledger_v1',
}

// Preload starter data
const preloadProjectState = (): Record<string, ProjectState> => {
  return createDefaultProjectState()
}

const preloadMilestones = (): Milestone[] => {
  const now = Date.now()
  const milestones: Milestone[] = []
  
  // Amanuel Travel
  const ataMilestones = [
    'Vercel deployment live',
    'Fix build errors (API/auth routes if failing)',
    'Confirm site opens reliably on mobile networks',
    'Add basic booking request form (flights/hotels)',
    'Add contact CTA (WhatsApp/email)',
    'Optimize images + performance',
    'Decide temporary domain plan → final domain',
  ]
  ataMilestones.forEach((text, idx) => {
    milestones.push({
      id: `ata-${idx}`,
      projectId: 'amanuel-travel',
      text,
      done: false,
      createdAt: now + idx,
    })
  })

  // SignalCrypt
  const signalMilestones = [
    'Offer page outline (Flash / War Room / Retainer)',
    'Delivery checklist written',
    '3 message templates finalized (cold/follow-up/close)',
    'List 10 prospects',
    'Outreach session completed (10 messages)',
    'First delivery workflow ready',
  ]
  signalMilestones.forEach((text, idx) => {
    milestones.push({
      id: `signal-${idx}`,
      projectId: 'signalcrypt',
      text,
      done: false,
      createdAt: now + 100 + idx,
    })
  })

  // Strong & Still
  const strongMilestones = [
    '7-day content plan written',
    "Today's post drafted",
    '1 short script ready',
    '1 post published',
    'Resource/freebie link added (if applicable)',
  ]
  strongMilestones.forEach((text, idx) => {
    milestones.push({
      id: `strong-${idx}`,
      projectId: 'strong-still',
      text,
      done: false,
      createdAt: now + 200 + idx,
    })
  })

  // Ark Engine
  const arkMilestones = [
    'Work Modes used daily',
    'Export backup saved',
    'Project state maintained weekly',
  ]
  arkMilestones.forEach((text, idx) => {
    milestones.push({
      id: `ark-${idx}`,
      projectId: 'ark-engine',
      text,
      done: false,
      createdAt: now + 300 + idx,
    })
  })

  return milestones
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
  const [workMode, setWorkMode] = useState<WorkMode>('dev')
  const [workModeOutputs, setWorkModeOutputs] = useState<Record<string, WorkModeOutput>>({})
  const [currentWorkModeOutput, setCurrentWorkModeOutput] = useState<string>('')
  const [projectState, setProjectState] = useState<Record<string, ProjectState>>({})
  const [projectLedger, setProjectLedger] = useState<Record<string, ProjectLedger>>({})
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [newMilestoneText, setNewMilestoneText] = useState('')
  const [scBatch, setScBatch] = useState<SignalCryptBatch | null>(() => loadSignalCryptBatch())
  const [scOutreachSpec, setScOutreachSpec] = useState<string>(() => loadSignalCryptOutreachSpec())
  const [scLoading, setScLoading] = useState(false)
  const [scError, setScError] = useState<string | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const storedProjectsRaw = safeJSONParse<Project[]>(localStorage.getItem(STORAGE_KEYS.projects), DEFAULT_PROJECTS)
    const storedProjects = mergeProjects(storedProjectsRaw)
    const storedTasks = safeJSONParse<Task[]>(localStorage.getItem(STORAGE_KEYS.tasks), [])
    const storedLogs = safeJSONParse<Log[]>(localStorage.getItem(STORAGE_KEYS.logs), [])
    const storedSettings = safeJSONParse<{ projectId: string; energy: Energy }>(
      localStorage.getItem(STORAGE_KEYS.settings),
      { projectId: DEFAULT_PROJECTS[0].id, energy: 'medium' }
    )
    const storedBrief = safeJSONParse<DailyBrief | null>(localStorage.getItem(STORAGE_KEYS.brief), null)
    const legacyStatuses = safeJSONParse<Record<string, ProjectStateStatus>>(
      localStorage.getItem('ark_project_status_v1'),
      {}
    )
    const storedWorkMode = safeJSONParse<WorkMode>(
      localStorage.getItem(STORAGE_KEYS.workMode),
      'dev'
    )
    const storedWorkModeOutputs = safeJSONParse<Record<string, WorkModeOutput>>(
      localStorage.getItem(STORAGE_KEYS.workModeOutputs),
      {}
    )
    const storedProjectState = safeJSONParse<Record<string, ProjectState>>(
      localStorage.getItem(STORAGE_KEYS.projectState),
      {}
    )
    const storedProjectLedger = safeJSONParse<Record<string, ProjectLedger>>(
      localStorage.getItem(STORAGE_KEYS.projectLedger),
      {}
    )
    const storedMilestones = safeJSONParse<Milestone[]>(
      localStorage.getItem(STORAGE_KEYS.milestones),
      []
    )

    // Preload starter data if storage is empty
    const defaultProjectState = createDefaultProjectState()
    let finalProjectState = { ...defaultProjectState }
    let finalMilestones = storedMilestones
    const defaultProjectLedger = createDefaultProjectLedger()
    let finalProjectLedger = { ...defaultProjectLedger }
    
    if (Object.keys(storedProjectState).length === 0 && Object.keys(legacyStatuses).length > 0) {
      Object.entries(legacyStatuses).forEach(([projectId, status]) => {
        if (finalProjectState[projectId]) {
          finalProjectState[projectId] = {
            ...finalProjectState[projectId],
            stage: status,
          }
        }
      })
    } else if (Object.keys(storedProjectState).length === 0) {
      finalProjectState = preloadProjectState()
    } else {
      Object.entries(storedProjectState).forEach(([projectId, state]) => {
        finalProjectState[projectId] = {
          ...finalProjectState[projectId],
          ...state,
        }
      })
    }
    
    if (storedMilestones.length === 0) {
      finalMilestones = preloadMilestones()
      localStorage.setItem(STORAGE_KEYS.milestones, JSON.stringify(finalMilestones))
    }
    
    if (Object.keys(storedProjectLedger).length > 0) {
      Object.entries(storedProjectLedger).forEach(([projectId, ledger]) => {
        finalProjectLedger[projectId] = {
          ...finalProjectLedger[projectId],
          ...ledger,
          oneSentenceGoal: ledger.oneSentenceGoal || finalProjectLedger[projectId]?.oneSentenceGoal || '',
        }
      })
    }

    setProjects(storedProjects)
    setTasks(storedTasks)
    setLogs(storedLogs)
    const resolvedProjectId = storedProjects.some(project => project.id === storedSettings.projectId)
      ? storedSettings.projectId
      : DEFAULT_PROJECTS[0].id
    setSelectedProjectId(resolvedProjectId)
    setEnergy(storedSettings.energy)
    setWorkMode(storedWorkMode)
    setWorkModeOutputs(storedWorkModeOutputs)
    setProjectState(finalProjectState)
    setProjectLedger(finalProjectLedger)
    setMilestones(finalMilestones)
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

  // Save workMode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.workMode, JSON.stringify(workMode))
  }, [workMode])

  // Save workModeOutputs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.workModeOutputs, JSON.stringify(workModeOutputs))
  }, [workModeOutputs])

  // Save projectState to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.projectState, JSON.stringify(projectState))
  }, [projectState])

  // Save projectLedger to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.projectLedger, JSON.stringify(projectLedger))
  }, [projectLedger])

  // Save SignalCrypt outreach spec to localStorage
  useEffect(() => {
    saveSignalCryptOutreachSpec(scOutreachSpec)
  }, [scOutreachSpec])

  // Save milestones to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.milestones, JSON.stringify(milestones))
  }, [milestones])

  // Get tasks for current project
  const currentProjectTasks = tasks.filter(t => t.projectId === selectedProjectId)
  const openTasks = currentProjectTasks.filter(t => !t.completed).sort((a, b) => b.createdAt - a.createdAt)
  const top3Tasks = openTasks.slice(0, 3)

  // Get logs for current project
  const currentProjectLogs = logs
    .filter(l => l.projectId === selectedProjectId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)

  // Get current project state
  const currentProjectState = projectState[selectedProjectId] || {
    stage: 'Planning' as ProjectStateStatus,
    blockers: '',
    nextCheckpoint: '',
  }

  const currentProject = projects.find(p => p.id === selectedProjectId)

  // Get current project ledger
  const currentProjectLedger =
    projectLedger[selectedProjectId] ||
    createDefaultProjectLedger()[selectedProjectId] || {
      mission: '',
      oneSentenceGoal: currentProject?.goal || '',
      currentReality: '',
      whatIsDone: '',
      whatIsWorking: '',
      whatIsBroken: '',
      whatIsMissing: '',
      assets: '',
      constraints: '',
      nextFocus: '',
      killCriteria: '',
      automationStatus: '',
      confidenceScore: null,
      lastUpdated: '',
    }
  const confidenceScore = currentProjectLedger?.confidenceScore ?? null
  const isConfidenceUnset = confidenceScore === null
  const isConfidenceLow = confidenceScore !== null && confidenceScore < 3

  // Get current project status (paused if stage is Paused)
  const isProjectPaused = currentProjectState.stage === 'Paused'
  const isSacredProject = currentProject?.category === 'Sacred'

  const buildingProjectIds = Object.entries(projectState)
    .filter(([, state]) => state.stage === 'Building')
    .map(([projectId]) => projectId)
  const buildingProjectNames = buildingProjectIds.map(projectId => {
    return projects.find(project => project.id === projectId)?.name || projectId
  })
  const hasBuildingConflict = buildingProjectIds.length > 1
  const isExecutionBlocked = hasBuildingConflict || isConfidenceLow || isConfidenceUnset

  const signalCryptState = projectState['signalcrypt']
  const signalCryptLedger =
    projectLedger['signalcrypt'] ||
    createDefaultProjectLedger()['signalcrypt'] || {
      mission: '',
      oneSentenceGoal: '',
      currentReality: '',
      whatIsDone: '',
      whatIsWorking: '',
      whatIsBroken: '',
      whatIsMissing: '',
      assets: '',
      constraints: '',
      nextFocus: '',
      killCriteria: '',
      automationStatus: '',
      confidenceScore: null,
      lastUpdated: '',
    }
  const signalCryptConfidence = signalCryptLedger?.confidenceScore ?? null
  const isSignalCryptPaused = signalCryptState?.stage === 'Paused'
  const isSignalCryptLocked = hasBuildingConflict || isSignalCryptPaused || signalCryptConfidence === null || signalCryptConfidence < 3
  const signalCryptLockReason = hasBuildingConflict
    ? 'Resolve the Building conflict first.'
    : isSignalCryptPaused
    ? 'SignalCrypt is paused.'
    : signalCryptConfidence === null
    ? 'Set a SignalCrypt confidence score before generating batches.'
    : 'SignalCrypt confidence is below 3.'

  const executionBlockMessages: string[] = []
  if (hasBuildingConflict) {
    executionBlockMessages.push(`Multiple projects in Building: ${buildingProjectNames.join(', ')}`)
  }
  if (isConfidenceUnset) {
    executionBlockMessages.push('Confidence score is not set for this project')
  } else if (isConfidenceLow) {
    executionBlockMessages.push('Confidence score is below 3 for this project')
  }

  const canEnterBuilding =
    !isConfidenceLow &&
    !isConfidenceUnset &&
    (buildingProjectIds.length === 0 || buildingProjectIds.includes(selectedProjectId))
  const canEnterShipping = !isConfidenceLow && !isConfidenceUnset

  // Get current project milestones
  const currentProjectMilestones = milestones
    .filter(m => m.projectId === selectedProjectId)
    .sort((a, b) => a.createdAt - b.createdAt)
  
  const milestoneProgress = {
    done: currentProjectMilestones.filter(m => m.done).length,
    total: currentProjectMilestones.length,
  }

  // Get last shipped log
  const lastShippedLog = currentProjectLogs.length > 0 ? currentProjectLogs[0] : null
  const lastShippedDisplay = lastShippedLog
    ? `${new Date(lastShippedLog.timestamp).toLocaleString()}: ${lastShippedLog.text.split('\n')[0].slice(0, 60)}${lastShippedLog.text.split('\n')[0].length > 60 ? '...' : ''}`
    : 'No logs yet'

  const touchLedgerUpdate = () => {
    const baseLedger = projectLedger[selectedProjectId] || currentProjectLedger
    setProjectLedger({
      ...projectLedger,
      [selectedProjectId]: {
        ...baseLedger,
        lastUpdated: new Date().toISOString(),
      },
    })
  }

  // Update project state
  const handleUpdateProjectState = (field: keyof ProjectState, value: string | ProjectStateStatus) => {
    if (field === 'stage') {
      const nextStage = value as ProjectStateStatus
      if ((nextStage === 'Building' || nextStage === 'Shipping') && (isConfidenceLow || isConfidenceUnset)) {
        alert('Confidence must be 3+ to move into Building or Shipping.')
        return
      }
      if (nextStage === 'Building') {
        const otherBuilding = buildingProjectIds.filter(projectId => projectId !== selectedProjectId)
        if (otherBuilding.length > 0) {
          alert('Only one project can be in Building. Resolve the conflict first.')
          return
        }
      }
    }

    setProjectState({
      ...projectState,
      [selectedProjectId]: {
        ...currentProjectState,
        [field]: value,
      },
    })
    touchLedgerUpdate()
  }

  const handleUpdateProjectLedger = (field: keyof ProjectLedger, value: string | number | null) => {
    const currentLedger = projectLedger[selectedProjectId] || currentProjectLedger
    const nextValue =
      field === 'confidenceScore'
        ? value === null
          ? null
          : Number(value)
        : value
    setProjectLedger({
      ...projectLedger,
      [selectedProjectId]: {
        ...currentLedger,
        [field]: nextValue,
        lastUpdated: new Date().toISOString(),
      },
    })
  }

  const handleMarkWeeklyUpdate = () => {
    const currentLedger = projectLedger[selectedProjectId] || currentProjectLedger
    setProjectLedger({
      ...projectLedger,
      [selectedProjectId]: {
        ...currentLedger,
        lastUpdated: new Date().toISOString(),
      },
    })
  }

  // Add milestone
  const handleAddMilestone = () => {
    if (!newMilestoneText.trim() || isProjectPaused) return
    const newMilestone: Milestone = {
      id: uid(),
      projectId: selectedProjectId,
      text: newMilestoneText.trim(),
      done: false,
      createdAt: Date.now(),
    }
    setMilestones([...milestones, newMilestone])
    setNewMilestoneText('')
  }

  // Toggle milestone
  const handleToggleMilestone = (milestoneId: string) => {
    if (isProjectPaused) return
    setMilestones(milestones.map(m => (m.id === milestoneId ? { ...m, done: !m.done } : m)))
  }

  // Delete milestone
  const handleDeleteMilestone = (milestoneId: string) => {
    if (isProjectPaused) return
    setMilestones(milestones.filter(m => m.id !== milestoneId))
  }

  // Load last work mode output for current project
  useEffect(() => {
    const lastOutput = workModeOutputs[selectedProjectId]
    if (lastOutput && lastOutput.mode === workMode) {
      setCurrentWorkModeOutput(lastOutput.text)
    } else {
      setCurrentWorkModeOutput('')
    }
  }, [selectedProjectId, workMode, workModeOutputs])

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

  // Generate Work Mode output
  const generateWorkModeOutput = (): string => {
    const selectedProject = projects.find(p => p.id === selectedProjectId)
    if (!selectedProject) return ''

    let output = ''

    // Context section
    output += 'CONTEXT\n'
    output += `State: ${currentProjectState.stage}\n`
    output += `Category: ${selectedProject.category}\n`
    output += `Confidence: ${confidenceScore === null ? 'Unknown' : `${confidenceScore}/5`}\n`
    if (hasBuildingConflict) {
      output += `Execution: PAUSED (multiple projects in Building: ${buildingProjectNames.join(', ')})\n`
    } else if (isConfidenceUnset) {
      output += 'Execution: PAUSED (confidence not set)\n'
    } else if (isConfidenceLow) {
      output += 'Execution: PAUSED (confidence below 3)\n'
    }
    if (selectedProject.category === 'Sacred') {
      output += 'Automation: sacred boundary (slow, manual, protected)\n'
    } else {
      output += 'Automation: approval required before outbound actions\n'
    }
    if (currentProjectState.blockers.trim()) {
      const blockersShort = currentProjectState.blockers.length > 100 
        ? currentProjectState.blockers.slice(0, 100) + '...'
        : currentProjectState.blockers
      output += `Blockers: ${blockersShort}\n`
    }
    if (currentProjectState.nextCheckpoint.trim()) {
      output += `Next Checkpoint: ${currentProjectState.nextCheckpoint}\n`
    }
    if (currentProjectLedger.nextFocus.trim()) {
      output += `Next Focus: ${currentProjectLedger.nextFocus}\n`
    }
    output += `Milestones: ${milestoneProgress.done}/${milestoneProgress.total} done\n`
    output += '\n'

    if (workMode === 'dev') {
      // Unblock First
      if (currentProjectState.blockers.trim()) {
        output += 'UNBLOCK FIRST\n'
        output += `Address blockers: ${currentProjectState.blockers.split(';')[0].trim()}\n`
        output += '\n'
      }

      // Mission
      let mission = ''
      if (energy === 'low') {
        mission = `Focus on one small step toward: ${selectedProject.goal}`
      } else if (energy === 'medium') {
        mission = `Make steady progress on: ${selectedProject.goal}`
      } else {
        mission = `Ship something meaningful for: ${selectedProject.goal}`
      }
      output += `MISSION\n${mission}\n\n`

      // Top 3 Actions
      output += 'TOP 3 ACTIONS\n'
      top3Tasks.forEach((task, index) => {
        const action = task.nextAction || task.text
        output += `${index + 1}. ${action}\n`
      })
      output += '\n'

      // Build/Debug Checklist
      output += 'BUILD/DEBUG CHECKLIST\n'
      output += '• Run dev server\n'
      output += '• Check console errors\n'
      output += '• Verify build compiles\n'
      if (selectedProjectId === 'amanuel-travel') {
        output += '• Verify environment variables\n'
      }
      output += '• Check routes/navigation\n'
      output += '• Test key user flows\n'
      output += '\n'

      // Terminal Commands
      output += 'TERMINAL COMMANDS\n'
      output += '```\n'
      if (selectedProjectId === 'amanuel-travel') {
        output += 'npm install\n'
        output += 'npm run dev\n'
        output += 'npm run build\n'
        output += 'npm run lint\n'
      } else if (selectedProjectId === 'ark-engine') {
        output += 'npm run dev\n'
        output += 'npm run build\n'
      } else {
        output += 'npm run dev\n'
        output += 'npm run build\n'
      }
      output += '```\n\n'

      // Definition of Done
      output += 'DEFINITION OF DONE\n'
      const doneCount = energy === 'low' ? 1 : energy === 'medium' ? 2 : 3
      if (doneCount >= 1) output += '• At least one task completed\n'
      if (doneCount >= 2) output += '• Code changes tested locally\n'
      if (doneCount >= 3) output += '• Build passes without errors\n'
      if (currentProjectState.nextCheckpoint.trim()) {
        output += `• Progress toward: ${currentProjectState.nextCheckpoint}\n`
      }

    } else if (workMode === 'sales') {
      // Unblock First
      if (currentProjectState.blockers.trim()) {
        output += 'UNBLOCK FIRST\n'
        output += `Address blockers: ${currentProjectState.blockers.split(';')[0].trim()}\n`
        output += '\n'
      }

      // Offer Snapshot
      output += 'OFFER SNAPSHOT\n'
      output += `• Today's focus: ${selectedProject.goal}\n`
      if (top3Tasks.length > 0) {
        output += `• Key deliverable: ${top3Tasks[0].text}\n`
      }
      output += `• Energy level: ${energy}\n`
      if (top3Tasks.length > 1) {
        output += `• Secondary value: ${top3Tasks[1].text}\n`
      }
      output += '\n'

      // Client Pipeline
      output += 'CLIENT PIPELINE\n'
      output += '□ Lead - Identify potential client\n'
      output += '□ Qualify - Assess fit and need\n'
      output += '□ Confirm - Agree on scope and timeline\n'
      output += '□ Deliver - Execute on promise\n'
      output += '□ Collect - Receive payment/feedback\n'
      output += '□ Review - Learn and improve\n'
      output += '\n'

      // Message Templates
      output += 'MESSAGE TEMPLATES\n\n'
      output += 'Cold Intro (Short)\n'
      output += `Hi [Name], I noticed [specific observation about their business/need]. I help with ${selectedProject.goal.toLowerCase()}. Open to a quick chat this week?\n\n`
      
      output += 'Follow-up (24h)\n'
      output += `Hi [Name], Following up on [previous touchpoint]. I wanted to share [specific value/insight related to ${selectedProject.goal.toLowerCase()}]. Does this align with your goals?\n\n`
      
      output += 'Close + Booking/Payment Request\n'
      output += `Hi [Name], Based on our discussion, here's what I can deliver: [specific deliverable from top tasks]. Next steps: [clear action]. Ready to move forward?\n\n`

      // Deliverable Checklist
      output += 'DELIVERABLE CHECKLIST\n'
      top3Tasks.forEach((task) => {
        output += `• ${task.text}${task.nextAction ? ` - ${task.nextAction}` : ''}\n`
      })
      output += '\n'

      // Next 15 Minutes
      output += 'NEXT 15 MINUTES\n'
      if (energy === 'low') {
        output += '1. Review client list\n2. Send one follow-up\n3. Organize notes\n'
      } else if (energy === 'medium') {
        output += '1. Draft 2 outreach messages\n2. Review pipeline status\n3. Update CRM/notes\n'
      } else {
        output += '1. Send 3 outreach messages\n2. Schedule 2 discovery calls\n3. Prepare pitch deck\n'
      }
      if (currentProjectState.nextCheckpoint.trim()) {
        output += `\nCLOSING OUTCOME\n${currentProjectState.nextCheckpoint}\n`
      }

    } else if (workMode === 'content') {
      // Unblock First
      if (currentProjectState.blockers.trim()) {
        output += 'UNBLOCK FIRST\n'
        output += `Address blockers: ${currentProjectState.blockers.split(';')[0].trim()}\n`
        output += '\n'
      }

      // Today's Theme
      const themeWords = top3Tasks.map(t => t.text.split(' ').slice(0, 2).join(' ')).join(', ')
      output += `TODAY'S THEME\n${selectedProject.goal}${themeWords ? ` - ${themeWords}` : ''}\n\n`

      // Hook Options
      output += 'HOOK OPTIONS\n'
      output += `1. ${selectedProject.goal}: The truth most people miss\n`
      if (top3Tasks.length > 0) {
        output += `2. How I [${top3Tasks[0].text.toLowerCase().slice(0, 30)}...] in 30 days\n`
      }
      output += `3. ${selectedProject.goal}: 3 lessons learned\n\n`

      // Content Outline
      output += 'CONTENT OUTLINE\n'
      output += `• Introduction: Why ${selectedProject.goal.toLowerCase()} matters\n`
      top3Tasks.forEach((task) => {
        output += `• Point: ${task.text}\n`
      })
      output += `• Insight: What I learned\n`
      output += `• Action: Next steps for the audience\n`
      output += '• Conclusion: Call to engagement\n\n'

      // CTA Options
      output += 'CTA OPTIONS\n'
      output += '1. What has been your experience with [topic]? Share below.\n'
      output += '2. Save this for later and follow for more insights.\n'
      output += '3. DM me if you want to dive deeper into [specific aspect].\n\n'

      // Creation Plan
      const planMinutes = energy === 'low' ? 30 : 60
      output += `${planMinutes}-MINUTE CREATION PLAN\n`
      if (energy === 'low') {
        output += '1. Write draft (15 min)\n2. Edit and refine (10 min)\n3. Format and post (5 min)\n'
      } else {
        output += '1. Research and outline (15 min)\n2. Write full draft (25 min)\n3. Edit and refine (15 min)\n4. Format and post (5 min)\n'
      }
      output += '\nPOSTING GOAL\n'
      output += `State: ${currentProjectState.stage}\n`
      if (currentProjectState.nextCheckpoint.trim()) {
        output += `Checkpoint: ${currentProjectState.nextCheckpoint}\n`
      }
    }

    return output
  }

  // Generate Work Mode actions
  const handleGenerateWorkModeActions = () => {
    if (isExecutionBlocked) return
    const output = generateWorkModeOutput()
    setCurrentWorkModeOutput(output)
    
    // Save to workModeOutputs
    setWorkModeOutputs({
      ...workModeOutputs,
      [selectedProjectId]: {
        mode: workMode,
        text: output,
        createdAt: Date.now(),
      },
    })
  }

  // Copy Work Mode output
  const handleCopyWorkModeOutput = () => {
    if (!currentWorkModeOutput) return
    navigator.clipboard.writeText(currentWorkModeOutput)
  }

  // Save Work Mode output as log
  const handleSaveWorkModeAsLog = () => {
    if (!currentWorkModeOutput || isProjectPaused) return
    const modeLabel = workMode === 'dev' ? 'Dev' : workMode === 'sales' ? 'Sales' : 'Content'
    const logTextWithPrefix = `[AUTO WORKMODE: ${modeLabel}]\n\n${currentWorkModeOutput}`
    const newLog: Log = {
      id: uid(),
      timestamp: new Date().toISOString(),
      projectId: selectedProjectId,
      energy,
      text: logTextWithPrefix,
    }
    setLogs([newLog, ...logs])
  }

  // Generate daily brief
  const handleGenerateBrief = () => {
    if (isExecutionBlocked) return
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
      workMode,
      workModeOutputs,
      projectState,
      milestones,
      projectLedger,
      outreachAgentSpec: scOutreachSpec,
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
          if (data.projects) setProjects(mergeProjects(data.projects))
          // Restore workMode if present, otherwise keep existing
          if (data.workMode) {
            setWorkMode(data.workMode)
          }
          // Restore workModeOutputs if present, otherwise keep existing
          if (data.workModeOutputs) {
            setWorkModeOutputs(data.workModeOutputs)
          }
          // Restore projectState if present, otherwise keep existing
          if (data.projectState) {
            const defaults = createDefaultProjectState()
            const mergedState = { ...defaults }
            Object.entries(data.projectState).forEach(([projectId, state]) => {
              mergedState[projectId] = {
                ...mergedState[projectId],
                ...state,
              }
            })
            setProjectState(mergedState)
          } else if (data.projectStatuses) {
            const defaults = createDefaultProjectState()
            Object.entries(data.projectStatuses).forEach(([projectId, status]) => {
              if (defaults[projectId]) {
                defaults[projectId] = {
                  ...defaults[projectId],
                  stage: status,
                }
              }
            })
            setProjectState(defaults)
          }
          // Restore milestones if present, otherwise keep existing
          if (data.milestones) {
            setMilestones(data.milestones)
          }
          // Restore projectLedger if present, otherwise keep existing
          if (data.projectLedger) {
            const defaults = createDefaultProjectLedger()
            const mergedLedger = { ...defaults }
            Object.entries(data.projectLedger).forEach(([projectId, ledger]) => {
              mergedLedger[projectId] = {
                ...mergedLedger[projectId],
                ...ledger,
                oneSentenceGoal: ledger.oneSentenceGoal || mergedLedger[projectId]?.oneSentenceGoal || '',
              }
            })
            setProjectLedger(mergedLedger)
          }
          if (data.outreachAgentSpec) {
            setScOutreachSpec(data.outreachAgentSpec)
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

  async function fetchSignalCryptBatch() {
    if (isSignalCryptLocked) {
      setScError(signalCryptLockReason)
      return
    }
    setScLoading(true)
    setScError(null)
    try {
      const API_BASE = import.meta.env.DEV ? "https://ark-engine.vercel.app" : "";
      const res = await fetch(`${API_BASE}/api/signalcrypt/generate-batch`, { method: "POST" })
      if (!res.ok) {
        // Fallback to mock data in development (API only works on Vercel)
        if (res.status === 404) {
          const mockBatch: SignalCryptBatch = {
            batchId: `SC-${new Date().toISOString().split('T')[0]}`,
            preparedAt: new Date().toISOString(),
            limits: { email: 15, dm: 3 },
            discoveryRule: "B2B SaaS companies in North America with 10–200 employees that publicly make security, trust, privacy, compliance, or uptime claims on their website.",
            offer: { name: "War Room", price: "$1,000" },
            angle: "risk",
            targets: Array.from({ length: 15 }).map((_, i) => ({
              name: `Target ${i + 1}`,
              website: "",
              whySelected: "Fits: B2B SaaS, North America, ~10–200 employees, makes security/trust/privacy/compliance/uptime claims (needs verification).",
              channel: "email",
              email: "",
              dmHandle: "",
              notes: "needs discovery/enrichment",
            })),
            email: {
              subjectA: "Quick question about your trust & security claims",
              body1: "Hey {{firstName}},\n\nI'm reaching out because {{company}} publicly positions around trust/security/privacy.\n\nSignalCrypt is a fast \"Breach Suite\" that spots where trust breaks (messaging + compliance signals + exposure surfaces) and returns a clear fix list.\n\nIf I ran a quick pass and sent you 3 specific findings, would you want them?\n\n— {{yourName}}\nSignalCrypt",
              body2: "Hey {{firstName}},\n\nQuick follow-up — do you want the 3 findings pass for {{company}}?\nIf yes, tell me who should receive it.\n\n— {{yourName}}",
              followUpDelayDays: 4,
            },
            dm: {
              message: "Hey {{firstName}} — I emailed you a quick note about a 3-finding trust/security pass for {{company}}. Want me to send it over?",
              maxTargets: 3,
              eligibilityRule: "only after no reply to email sequence OR clearly DM-first",
            },
            executionPlan: {
              schedule: [
                { day: "Day 0", action: "Send Email #1 to all email targets" },
                { day: "Day 4", action: "Send Email #2 only to non-responders" },
              ],
              stopConditions: ["any reply", "unsubscribe", "bounce", "manual pause"],
            },
            risks: ["deliverability", "brand risk", "rate limits"],
            safeguards: ["low volume", "honest messaging", "approval gate"],
            approval: { status: "PENDING", approvedBy: "", approvedAt: "" },
          }
          saveSignalCryptBatch(mockBatch)
          setScBatch(mockBatch)
          setScError(null)
          return
        }
        throw new Error(`Fetch failed: ${res.status}`)
      }
      const batch = (await res.json()) as SignalCryptBatch
      // Force PENDING unless already approved locally (don't auto-approve from server)
      batch.approval = batch.approval ?? { status: "PENDING", approvedBy: "", approvedAt: "" }
      if (batch.approval.status !== "APPROVED") {
        batch.approval.status = "PENDING"
        batch.approval.approvedBy = ""
        batch.approval.approvedAt = ""
      }
      saveSignalCryptBatch(batch)
      setScBatch(batch)
    } catch (e: any) {
      // If fetch completely fails (network error), also fall back to mock
      if (e?.message?.includes('404') || e?.message?.includes('Failed to fetch')) {
        const mockBatch: SignalCryptBatch = {
          batchId: `SC-${new Date().toISOString().split('T')[0]}`,
          preparedAt: new Date().toISOString(),
          limits: { email: 15, dm: 3 },
          discoveryRule: "B2B SaaS companies in North America with 10–200 employees that publicly make security, trust, privacy, compliance, or uptime claims on their website.",
          offer: { name: "War Room", price: "$1,000" },
          angle: "risk",
          targets: Array.from({ length: 15 }).map((_, i) => ({
            name: `Target ${i + 1}`,
            website: "",
            whySelected: "Fits: B2B SaaS, North America, ~10–200 employees, makes security/trust/privacy/compliance/uptime claims (needs verification).",
            channel: "email",
            email: "",
            dmHandle: "",
            notes: "needs discovery/enrichment",
          })),
          email: {
            subjectA: "Quick question about your trust & security claims",
            body1: "Hey {{firstName}},\n\nI'm reaching out because {{company}} publicly positions around trust/security/privacy.\n\nSignalCrypt is a fast \"Breach Suite\" that spots where trust breaks (messaging + compliance signals + exposure surfaces) and returns a clear fix list.\n\nIf I ran a quick pass and sent you 3 specific findings, would you want them?\n\n— {{yourName}}\nSignalCrypt",
            body2: "Hey {{firstName}},\n\nQuick follow-up — do you want the 3 findings pass for {{company}}?\nIf yes, tell me who should receive it.\n\n— {{yourName}}",
            followUpDelayDays: 4,
          },
          dm: {
            message: "Hey {{firstName}} — I emailed you a quick note about a 3-finding trust/security pass for {{company}}. Want me to send it over?",
            maxTargets: 3,
            eligibilityRule: "only after no reply to email sequence OR clearly DM-first",
          },
          executionPlan: {
            schedule: [
              { day: "Day 0", action: "Send Email #1 to all email targets" },
              { day: "Day 4", action: "Send Email #2 only to non-responders" },
            ],
            stopConditions: ["any reply", "unsubscribe", "bounce", "manual pause"],
          },
          risks: ["deliverability", "brand risk", "rate limits"],
          safeguards: ["low volume", "honest messaging", "approval gate"],
          approval: { status: "PENDING", approvedBy: "", approvedAt: "" },
        }
        saveSignalCryptBatch(mockBatch)
        setScBatch(mockBatch)
        setScError(null)
      } else {
        setScError(e?.message || "Failed to fetch batch")
      }
    } finally {
      setScLoading(false)
    }
  }

  function approveSignalCryptBatch() {
    if (!scBatch) return
    const updated: SignalCryptBatch = {
      ...scBatch,
      approval: {
        status: "APPROVED",
        approvedBy: "Yonatan",
        approvedAt: new Date().toISOString(),
      },
    }
    saveSignalCryptBatch(updated)
    setScBatch(updated)
  }

  function rejectSignalCryptBatch() {
    if (!scBatch) return
    const updated: SignalCryptBatch = {
      ...scBatch,
      approval: {
        status: "REJECTED",
        approvedBy: "Yonatan",
        approvedAt: new Date().toISOString(),
      },
    }
    saveSignalCryptBatch(updated)
    setScBatch(updated)
  }

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

      {hasBuildingConflict && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>Building Conflict Detected</div>
          <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
            Only one project can be in Building. Current Building projects: {buildingProjectNames.join(', ')}.
          </div>
        </div>
      )}

      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Operating Principles</div>
        <ul style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#374151', lineHeight: '1.6', fontSize: '13px' }}>
          <li>Clarity over speed. Truth over appearance. Sustainability over hype. Alignment over automation.</li>
          <li>Sacred work stays protected and slow. Commercial work requires approval gates.</li>
          <li>Only one project can be in Building at a time.</li>
          <li>Confidence below 3 pauses automation and execution.</li>
        </ul>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          Current project type: <strong style={{ color: '#111827' }}>{currentProject?.category || 'Unknown'}</strong>
        </div>
        {executionBlockMessages.length > 0 && (
          <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', fontSize: '12px' }}>
            <strong>Execution locked:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
              {executionBlockMessages.map((message, idx) => (
                <li key={idx}>{message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* SignalCrypt Weekly Batch Card */}
      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>SignalCrypt Weekly Batch</div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>
              Source: <span style={{ fontFamily: 'monospace' }}>/api/signalcrypt/generate-batch</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={fetchSignalCryptBatch}
              disabled={scLoading || isSignalCryptLocked}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: scLoading || isSignalCryptLocked ? '#e5e7eb' : '#2563eb',
                color: 'white',
                cursor: scLoading || isSignalCryptLocked ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              {scLoading ? 'Generating...' : 'Generate Batch'}
            </button>

            <button
              onClick={approveSignalCryptBatch}
              disabled={!scBatch || scBatch.approval.status === 'APPROVED' || isSignalCryptLocked}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #16a34a',
                background: !scBatch || scBatch.approval.status === 'APPROVED' || isSignalCryptLocked ? '#e5e7eb' : '#16a34a',
                color: 'white',
                cursor: !scBatch || scBatch.approval.status === 'APPROVED' || isSignalCryptLocked ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Approve
            </button>

            <button
              onClick={rejectSignalCryptBatch}
              disabled={!scBatch || scBatch.approval.status === 'REJECTED'}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #dc2626',
                background: !scBatch || scBatch.approval.status === 'REJECTED' ? '#e5e7eb' : '#dc2626',
                color: 'white',
                cursor: !scBatch || scBatch.approval.status === 'REJECTED' ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Reject
            </button>
          </div>
        </div>

        {isSignalCryptLocked && (
          <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', fontSize: '12px' }}>
            <strong>Locked:</strong> {signalCryptLockReason}
          </div>
        )}
        <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '12px' }}>
          Approval required before any outbound action. No emails, messages, or calls are sent from this screen.
        </div>

        {scError ? (
          <div style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fecaca' }}>
            <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>Error</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#7f1d1d' }}>{scError}</div>
          </div>
        ) : null}

        {scBatch ? (
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Batch</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{scBatch.batchId}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Prepared: {new Date(scBatch.preparedAt).toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Offer: {scBatch.offer.name} ({scBatch.offer.price})</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Angle: {scBatch.angle}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Limits: Email {scBatch.limits.email} / DM {scBatch.limits.dm}</div>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Approval</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{scBatch.approval.status}</div>
              {scBatch.approval.status !== 'PENDING' ? (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  By {scBatch.approval.approvedBy} @ {new Date(scBatch.approval.approvedAt).toLocaleString()}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Waiting for your approval.</div>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1', padding: '12px', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: '600', color: '#111827', marginBottom: '6px' }}>Email Copy (preview)</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}><strong>Subject:</strong> {scBatch.email.subjectA}</div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0', fontSize: '12px', color: '#111827', fontFamily: 'monospace', lineHeight: '1.5' }}>{scBatch.email.body1}</pre>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '12px', color: '#6b7280', fontSize: '12px' }}>
            No batch loaded yet. Click <strong>Generate Batch</strong> to pull the weekly batch from Vercel.
          </div>
        )}
      </div>

      {/* SignalCrypt Outreach Agent Spec v1 */}
      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>SignalCrypt → Outreach Agent → Spec v1</div>
        <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px' }}>
          Permanent truth record. Approval-gated; no outbound execution from this app.
        </div>
        <pre
          style={{
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            color: '#111827',
            margin: '0',
          }}
        >
          {scOutreachSpec}
        </pre>
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
            {isSacredProject && (
              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, border: '1px solid #999' }}>
                Sacred
              </span>
            )}
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
            {isExecutionBlocked && (
              <span
                style={{
                  padding: '3px 10px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                }}
              >
                EXECUTION LOCKED
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
          disabled={isExecutionBlocked}
          style={{
            padding: '10px 20px',
            background: isExecutionBlocked ? '#e5e7eb' : '#2563eb',
            color: isExecutionBlocked ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isExecutionBlocked ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Generate Daily Brief
        </button>
      </div>

      {/* Project State Card */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ marginTop: '0', fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: '#111827' }}>Project State</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>State</label>
            <select
              value={currentProjectState.stage}
              onChange={(e) => handleUpdateProjectState('stage', e.target.value as ProjectStateStatus)}
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
              <option value="Planning">Planning</option>
              <option value="Building" disabled={!canEnterBuilding}>Building</option>
              <option value="Shipping" disabled={!canEnterShipping}>Shipping</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Paused">Paused</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Confidence</label>
            <select
              value={confidenceScore ?? ''}
              onChange={(e) =>
                handleUpdateProjectLedger('confidenceScore', e.target.value === '' ? null : Number(e.target.value))
              }
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
              <option value="">Unknown</option>
              <option value="1">1 - Very Low</option>
              <option value="2">2 - Low</option>
              <option value="3">3 - Steady</option>
              <option value="4">4 - Confident</option>
              <option value="5">5 - Locked</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Next Checkpoint</label>
            <input
              type="text"
              value={currentProjectState.nextCheckpoint}
              onChange={(e) => handleUpdateProjectState('nextCheckpoint', e.target.value)}
              placeholder="What's the next checkpoint?"
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Blockers</label>
          <textarea
            value={currentProjectState.blockers}
            onChange={(e) => handleUpdateProjectState('blockers', e.target.value)}
            placeholder="What's blocking progress?"
            rows={3}
            style={{
              padding: '10px 14px',
              fontSize: '14px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#111827',
              fontFamily: 'inherit',
              resize: 'vertical',
              cursor: 'text',
            }}
          />
        </div>
        {(isConfidenceLow || isConfidenceUnset) && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', fontSize: '12px' }}>
            Execution is locked until confidence is 3+ for this project.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Last Shipped</label>
          <div style={{
            padding: '10px 14px',
            fontSize: '13px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            color: '#6b7280',
          }}>
            {lastShippedDisplay}
          </div>
        </div>
      </div>

      {/* Project Truth Ledger */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ marginTop: '0', fontSize: '18px', marginBottom: '16px', fontWeight: '600', color: '#111827' }}>Project Truth Ledger</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Mission</label>
            <input
              type="text"
              value={currentProjectLedger.mission}
              onChange={(e) => handleUpdateProjectLedger('mission', e.target.value)}
              placeholder="Unknown - update mission"
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>One Sentence Goal</label>
            <input
              type="text"
              value={currentProjectLedger.oneSentenceGoal}
              onChange={(e) => handleUpdateProjectLedger('oneSentenceGoal', e.target.value)}
              placeholder="Unknown - update goal"
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Current Reality</label>
            <textarea
              value={currentProjectLedger.currentReality}
              onChange={(e) => handleUpdateProjectLedger('currentReality', e.target.value)}
              placeholder="Unknown - update current reality"
              rows={3}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Next Focus</label>
            <textarea
              value={currentProjectLedger.nextFocus}
              onChange={(e) => handleUpdateProjectLedger('nextFocus', e.target.value)}
              placeholder="Unknown - update next focus"
              rows={3}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>What Is Done</label>
            <textarea
              value={currentProjectLedger.whatIsDone}
              onChange={(e) => handleUpdateProjectLedger('whatIsDone', e.target.value)}
              placeholder="Unknown - update what's done"
              rows={3}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>What Is Working</label>
            <textarea
              value={currentProjectLedger.whatIsWorking}
              onChange={(e) => handleUpdateProjectLedger('whatIsWorking', e.target.value)}
              placeholder="Unknown - update what's working"
              rows={3}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>What Is Broken</label>
            <textarea
              value={currentProjectLedger.whatIsBroken}
              onChange={(e) => handleUpdateProjectLedger('whatIsBroken', e.target.value)}
              placeholder="Unknown - update what's broken"
              rows={3}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>What Is Missing</label>
            <textarea
              value={currentProjectLedger.whatIsMissing}
              onChange={(e) => handleUpdateProjectLedger('whatIsMissing', e.target.value)}
              placeholder="Unknown - update what's missing"
              rows={3}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Assets</label>
            <textarea
              value={currentProjectLedger.assets}
              onChange={(e) => handleUpdateProjectLedger('assets', e.target.value)}
              placeholder="Repos, sites, accounts, docs"
              rows={3}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Constraints</label>
            <textarea
              value={currentProjectLedger.constraints}
              onChange={(e) => handleUpdateProjectLedger('constraints', e.target.value)}
              placeholder="Time, money, tools, legal, personal"
              rows={3}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Automation Status</label>
            <input
              type="text"
              value={currentProjectLedger.automationStatus}
              onChange={(e) => handleUpdateProjectLedger('automationStatus', e.target.value)}
              placeholder="Not set - approval required before action"
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Kill Criteria</label>
            <textarea
              value={currentProjectLedger.killCriteria}
              onChange={(e) => handleUpdateProjectLedger('killCriteria', e.target.value)}
              placeholder="Define clear stop conditions"
              rows={2}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', color: '#111827', marginBottom: '6px' }}>Top 3 Tasks (auto)</div>
            {top3Tasks.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#6b7280' }}>No tasks yet.</div>
            ) : (
              <ol style={{ margin: '0', paddingLeft: '18px', fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>
                {top3Tasks.map(task => (
                  <li key={task.id}>{task.nextAction || task.text}</li>
                ))}
              </ol>
            )}
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', color: '#111827', marginBottom: '6px' }}>Ledger Updated</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
              {currentProjectLedger.lastUpdated ? new Date(currentProjectLedger.lastUpdated).toLocaleString() : 'Not updated yet'}
            </div>
            <button
              onClick={handleMarkWeeklyUpdate}
              style={{
                padding: '8px 12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              Mark Weekly Update
            </button>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>
              Weekly ritual: update current reality, next checkpoint, confidence score, pause stalled work, pick one Building project.
            </div>
          </div>
        </div>
      </div>

      {/* Milestones Card */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>Milestones</h2>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
            {milestoneProgress.done}/{milestoneProgress.total} done
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={newMilestoneText}
            onChange={(e) => setNewMilestoneText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
            placeholder={isProjectPaused ? "Project is paused - cannot add milestones" : "New milestone..."}
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
            onClick={handleAddMilestone}
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
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {currentProjectMilestones.length === 0 ? (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No milestones yet. Add one above.</p>
          ) : (
            currentProjectMilestones.map(milestone => (
              <div
                key={milestone.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: milestone.done ? '#f0fdf4' : '#ffffff',
                  border: `1px solid ${milestone.done ? '#86efac' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <input
                  type="checkbox"
                  checked={milestone.done}
                  onChange={() => handleToggleMilestone(milestone.id)}
                  disabled={isProjectPaused}
                  style={{
                    marginTop: '4px',
                    cursor: isProjectPaused ? 'not-allowed' : 'pointer',
                    width: '18px',
                    height: '18px',
                  }}
                />
                <span
                  style={{
                    flex: '1',
                    textDecoration: milestone.done ? 'line-through' : 'none',
                    color: milestone.done ? '#9ca3af' : '#111827',
                    lineHeight: '1.5',
                  }}
                >
                  {milestone.text}
                </span>
                <button
                  onClick={() => handleDeleteMilestone(milestone.id)}
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
            ))
          )}
        </div>
      </div>

      {/* Work Mode Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <label style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Work Mode</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setWorkMode('dev')}
              style={{
                padding: '8px 16px',
                background: workMode === 'dev' ? '#2563eb' : '#ffffff',
                color: workMode === 'dev' ? 'white' : '#111827',
                border: `1px solid ${workMode === 'dev' ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Dev
            </button>
            <button
              onClick={() => setWorkMode('sales')}
              style={{
                padding: '8px 16px',
                background: workMode === 'sales' ? '#2563eb' : '#ffffff',
                color: workMode === 'sales' ? 'white' : '#111827',
                border: `1px solid ${workMode === 'sales' ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Sales
            </button>
            <button
              onClick={() => setWorkMode('content')}
              style={{
                padding: '8px 16px',
                background: workMode === 'content' ? '#2563eb' : '#ffffff',
                color: workMode === 'content' ? 'white' : '#111827',
                border: `1px solid ${workMode === 'content' ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Content
            </button>
          </div>
          <button
            onClick={handleGenerateWorkModeActions}
            disabled={isExecutionBlocked}
            style={{
              padding: '8px 16px',
              background: isExecutionBlocked ? '#e5e7eb' : '#2563eb',
              color: isExecutionBlocked ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isExecutionBlocked ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            Generate Actions
          </button>
        </div>

        {/* Work Mode Output */}
        {currentWorkModeOutput && (
          <div
            style={{
              background: '#ffffff',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={handleCopyWorkModeOutput}
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                Copy Output
              </button>
              <button
                onClick={handleSaveWorkModeAsLog}
                disabled={isProjectPaused}
                style={{
                  padding: '8px 16px',
                  background: isProjectPaused ? '#e5e7eb' : '#2563eb',
                  color: isProjectPaused ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isProjectPaused ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                Save as Log
              </button>
            </div>
            <pre
              style={{
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                color: '#111827',
                maxHeight: '600px',
                overflowY: 'auto',
                margin: '0',
              }}
            >
              {currentWorkModeOutput}
            </pre>
          </div>
        )}
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
