import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Activity, Dumbbell, Calendar, LineChart, Users, Shield,
  Play, Plus, Check, Flame, Award, Globe, Timer, Calculator, TrendingUp,
  Sparkles, Copy, X, Trash2
} from 'lucide-react';
import { BodyVisualizer } from './components/BodyVisualizer';
import { 
  loginApi, fetchCurrentProfile, fetchExercises, createExerciseApi, enrichCatalogApi,
  fetchTemplates, createTemplateApi, fetchWeeklySummary, fetchLastWorkoutByTemplate,
  saveWorkoutSessionApi, fetchMeasurements, createMeasurementApi, 
  fetchCommunityFeed, fetchAllUsersAdmin, createUserAdminApi 
} from './services/api';

const VALID_MUSCLE_KEYS = [
  'chest', 'back_lats', 'biceps', 'triceps', 'shoulders', 'abs', 'obliques',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'forearms', 'trapezius'
];

function buildAiExercisePrompt(): string {
  return `Génère une liste d'exercices de musculation/cardio au format JSON strict.

Réponds UNIQUEMENT avec un tableau JSON (pas de texte autour, pas de markdown), où chaque élément a exactement cette forme :
{
  "name": "string",
  "description": "string",
  "category": "Musculation" ou "Cardio",
  "primary_muscles": ["clé1", "clé2"],
  "secondary_muscles": ["clé1"],
  "metric_type": "reps_weight",
  "default_rest_seconds": 60
}

Les clés muscles valides (n'utilise QUE celles-ci) : ${VALID_MUSCLE_KEYS.join(', ')}.

Décris ici ce que tu veux (ex: "5 exercices pour le dos", "des exercices de cardio HIIT") :
`;
}

interface AiParsedExercise {
  name: string;
  description: string;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  metric_type: string;
  default_rest_seconds: number;
}

function normalizeAiExercise(raw: any): AiParsedExercise {
  const filterMuscles = (arr: any): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((m: any) => typeof m === 'string' && VALID_MUSCLE_KEYS.includes(m));
  };
  const primary = filterMuscles(raw?.primary_muscles);
  return {
    name: typeof raw?.name === 'string' ? raw.name : '',
    description: typeof raw?.description === 'string' ? raw.description : '',
    category: raw?.category === 'Cardio' ? 'Cardio' : 'Musculation',
    primary_muscles: primary.length > 0 ? primary : ['chest'],
    secondary_muscles: filterMuscles(raw?.secondary_muscles),
    metric_type: 'reps_weight',
    default_rest_seconds: Number.isFinite(raw?.default_rest_seconds) ? raw.default_rest_seconds : 60
  };
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('fitpulse_token'));
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'live' | 'measurements' | 'exercises' | 'analytics' | 'community' | 'admin'>('dashboard');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@fitpulse.com');
  const [loginPassword, setLoginPassword] = useState('AdminSecure2026!');
  const [loginError, setLoginError] = useState('');

  // Data states
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [exercisesList, setExercisesList] = useState<any[]>([]);
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [measurementsList, setMeasurementsList] = useState<any[]>([]);
  const [communityList, setCommunityList] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [importingApi, setImportingApi] = useState(false);

  // Live workout mode state & Timer
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [lastSessionData, setLastSessionData] = useState<any>(null);
  const [liveTitle, setLiveTitle] = useState('Séance à la volée');
  const [liveBodyWeight, setLiveBodyWeight] = useState('');
  const [liveMeals, setLiveMeals] = useState('');
  const [liveNotes, setLiveNotes] = useState('');
  const [liveSets, setLiveSets] = useState<{ [exId: number]: any[] }>({});

  // Rest Timer state (Mobile Giant Display)
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // 1RM / RPE Calculator State
  const [calcWeight, setCalcWeight] = useState<string>('80');
  const [calcReps, setCalcReps] = useState<string>('8');
  const [calcRpe, setCalcRpe] = useState<string>('8');

  // PWA Deferred Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  // New Exercise Form State
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState('Musculation');
  const [newExMetric] = useState('reps_weight');
  const [newExRest] = useState(60);
  const [newExPrimary, setNewExPrimary] = useState<string[]>(['chest']);

  // AI Exercise Generation State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [aiParseError, setAiParseError] = useState('');
  const [aiParsedExercises, setAiParsedExercises] = useState<AiParsedExercise[]>([]);
  const [aiCreating, setAiCreating] = useState(false);

  // New Template Form State
  const [newTplTitle, setNewTplTitle] = useState('');
  const [newTplDesc, setNewTplDesc] = useState('');
  const [newTplSelectedEx, setNewTplSelectedEx] = useState<number[]>([]);

  // New Measurement State
  const [measWeight, setMeasWeight] = useState('');
  const [measChest, setMeasChest] = useState('');
  const [measWaist, setMeasWaist] = useState('');
  const [measBiceps, setMeasBiceps] = useState('');

  // New User Admin State
  const [adminNewEmail, setAdminNewEmail] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminNewName, setAdminNewName] = useState('');

  useEffect(() => {
    if (token) {
      loadProfileAndData();
    }
  }, [token]);

  // PWA Install prompt listener
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Timer countdown effect with Visual Alarm & Vibration
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && restSecondsLeft !== null && restSecondsLeft > 0) {
      interval = setInterval(() => {
        setRestSecondsLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (restSecondsLeft === 0) {
      setIsTimerActive(false);
      if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 500]);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, restSecondsLeft]);

  const loadProfileAndData = async () => {
    try {
      const user = await fetchCurrentProfile();
      setCurrentUser(user);
      refreshDashboard();
    } catch (err) {
      handleLogout();
    }
  };

  const refreshDashboard = async () => {
    try {
      const [wData, exData, tData, mData, cData] = await Promise.all([
        fetchWeeklySummary(),
        fetchExercises(),
        fetchTemplates(),
        fetchMeasurements(),
        fetchCommunityFeed()
      ]);
      setWeeklyData(wData);
      setExercisesList(exData);
      setTemplatesList(tData);
      setMeasurementsList(mData);
      setCommunityList(cData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPwa(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await loginApi(loginEmail, loginPassword);
      localStorage.setItem('fitpulse_token', data.access_token);
      setToken(data.access_token);
      setCurrentUser(data.user);
    } catch (err: any) {
      setLoginError(err.message || 'Identifiants invalides');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fitpulse_token');
    setToken(null);
    setCurrentUser(null);
  };

  const startLiveWorkout = async (template?: any) => {
    setActiveTemplate(template || null);
    setLiveTitle(template ? `Séance: ${template.title}` : 'Séance à la volée');
    setLiveBodyWeight('');
    setLiveMeals('');
    setLiveNotes('');
    
    let initialSets: { [exId: number]: any[] } = {};

    if (template && template.template_items) {
      const last = await fetchLastWorkoutByTemplate(template.id);
      setLastSessionData(last);

      template.template_items.forEach((item: any) => {
        const setsCount = item.target_sets || 3;
        initialSets[item.exercise_id] = Array.from({ length: setsCount }, (_, i) => ({
          set_number: i + 1,
          reps_completed: item.target_reps || 10,
          weight_kg: item.target_weight_kg || 0,
          duration_seconds: item.target_duration_seconds || 0,
          rest_seconds: item.rest_seconds || 60,
          completed: false
        }));
      });
    } else {
      setLastSessionData(null);
      if (exercisesList.length > 0) {
        const firstExId = exercisesList[0].id;
        initialSets[firstExId] = [
          { set_number: 1, reps_completed: 10, weight_kg: 20, rest_seconds: 60, completed: false },
          { set_number: 2, reps_completed: 10, weight_kg: 20, rest_seconds: 60, completed: false }
        ];
      }
    }

    setLiveSets(initialSets);
    setActiveTab('live');
  };

  const toggleSetComplete = (exId: number, setIdx: number) => {
    setLiveSets(prev => {
      const updatedEx = [...(prev[exId] || [])];
      const nextState = !updatedEx[setIdx].completed;
      updatedEx[setIdx] = { ...updatedEx[setIdx], completed: nextState };
      
      if (nextState) {
        const restSec = updatedEx[setIdx].rest_seconds || 60;
        setRestSecondsLeft(restSec);
        setIsTimerActive(true);
      }
      return { ...prev, [exId]: updatedEx };
    });
  };

  const updateSetDetail = (exId: number, setIdx: number, field: string, value: any) => {
    setLiveSets(prev => {
      const updatedEx = [...(prev[exId] || [])];
      updatedEx[setIdx] = { ...updatedEx[setIdx], [field]: Number(value) };
      return { ...prev, [exId]: updatedEx };
    });
  };

  const handleFinishWorkout = async () => {
    try {
      const exercisesPayload = Object.keys(liveSets).map((exIdStr, idx) => ({
        exercise_id: Number(exIdStr),
        order: idx + 1,
        sets: liveSets[Number(exIdStr)]
      }));

      await saveWorkoutSessionApi({
        template_id: activeTemplate ? activeTemplate.id : null,
        title: liveTitle,
        notes: liveNotes,
        body_weight_kg: liveBodyWeight ? parseFloat(liveBodyWeight) : null,
        meals_logged: liveMeals,
        exercises: exercisesPayload
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      alert("🎉 Séance sauvegardée avec succès !");
      await refreshDashboard();
      setActiveTab('dashboard');
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + err.message);
    }
  };

  const handleEnrichCatalog = async () => {
    setImportingApi(true);
    try {
      const imported = await enrichCatalogApi();
      alert(`🎉 ${imported.length} nouveau(x) exercice(s) certifié(s) importé(s) avec succès !`);
      await refreshDashboard();
    } catch (err: any) {
      alert("Erreur lors de l'import : " + err.message);
    } finally {
      setImportingApi(false);
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createExerciseApi({
        name: newExName,
        category: newExCategory,
        metric_type: newExMetric,
        default_rest_seconds: Number(newExRest),
        primary_muscles: newExPrimary,
        secondary_muscles: []
      });
      alert("Exercice ajouté à la BDD !");
      setNewExName('');
      refreshDashboard();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleOpenAiModal = () => {
    setAiPrompt(buildAiExercisePrompt());
    setAiJsonInput('');
    setAiParseError('');
    setAiParsedExercises([]);
    setAiModalOpen(true);
  };

  const handleCopyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
    } catch {
      // Clipboard indisponible (permissions navigateur) : l'utilisateur peut copier manuellement le texte.
    }
  };

  const handleParseAiJson = () => {
    setAiParseError('');
    try {
      const parsed = JSON.parse(aiJsonInput);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      if (list.length === 0) {
        setAiParseError('Le JSON ne contient aucun exercice.');
        return;
      }
      setAiParsedExercises(list.map(normalizeAiExercise).filter(ex => ex.name.trim().length > 0));
    } catch (err: any) {
      setAiParseError('JSON invalide : ' + err.message);
    }
  };

  const handleUpdateAiExercise = (index: number, patch: Partial<AiParsedExercise>) => {
    setAiParsedExercises(prev => prev.map((ex, i) => i === index ? { ...ex, ...patch } : ex));
  };

  const handleRemoveAiExercise = (index: number) => {
    setAiParsedExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateAiExercises = async () => {
    setAiCreating(true);
    let successCount = 0;
    const errors: string[] = [];
    for (const ex of aiParsedExercises) {
      try {
        await createExerciseApi(ex);
        successCount++;
      } catch (err: any) {
        errors.push(`${ex.name}: ${err.message}`);
      }
    }
    setAiCreating(false);
    alert(
      `${successCount} exercice(s) créé(s) avec succès.` +
      (errors.length > 0 ? `\n${errors.length} échec(s) :\n${errors.join('\n')}` : '')
    );
    if (successCount > 0) {
      setAiModalOpen(false);
      refreshDashboard();
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemsPayload = newTplSelectedEx.map((exId, idx) => ({
        exercise_id: exId,
        order: idx + 1,
        target_sets: 3,
        target_reps: 10,
        target_weight_kg: 0,
        rest_seconds: 60
      }));

      await createTemplateApi({
        title: newTplTitle,
        description: newTplDesc,
        items: itemsPayload
      });

      alert("Pré-séance créée avec succès !");
      setNewTplTitle('');
      setNewTplDesc('');
      setNewTplSelectedEx([]);
      refreshDashboard();
    } catch (err: any) {
      alert("Erreur création modèle : " + err.message);
    }
  };

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMeasurementApi({
        weight_kg: measWeight ? parseFloat(measWeight) : null,
        chest_cm: measChest ? parseFloat(measChest) : null,
        waist_cm: measWaist ? parseFloat(measWaist) : null,
        biceps_cm: measBiceps ? parseFloat(measBiceps) : null
      });
      alert("Mensuration enregistrée !");
      setMeasWeight('');
      setMeasChest('');
      setMeasWaist('');
      setMeasBiceps('');
      refreshDashboard();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleLoadAdminUsers = async () => {
    try {
      const users = await fetchAllUsersAdmin();
      setAdminUsers(users);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUserAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserAdminApi({
        email: adminNewEmail,
        password: adminNewPassword,
        full_name: adminNewName,
        role: "user"
      });
      alert("Utilisateur créé avec succès !");
      setAdminNewEmail('');
      setAdminNewPassword('');
      setAdminNewName('');
      handleLoadAdminUsers();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  // 1RM Calculation (Epley Formula: Weight * (1 + Reps/30))
  const parsedWeight = parseFloat(calcWeight) || 0;
  const parsedReps = parseInt(calcReps, 10) || 0;
  const calculated1RM = parsedReps > 0 ? Math.round(parsedWeight * (1 + parsedReps / 30) * 10) / 10 : 0;

  if (!token || !currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(0,242,254,0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
            <Activity size={40} color="var(--primary-accent)" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>FitPulse Pro</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Plateforme sécurisée de tracking & d'optimisation à la salle
          </p>

          {loginError && (
            <div style={{ background: 'rgba(255,8,68,0.15)', border: '1px solid #ff0844', color: '#ff0844', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Email</label>
              <input type="email" className="input-field" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Mot de passe</label>
              <input type="password" className="input-field" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
              Se Connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeMuscles = activeTemplate?.template_items?.flatMap((i: any) => i.exercise.primary_muscles) || [];

  return (
    <div className="app-container">
      {/* Desktop Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={28} color="var(--primary-accent)" />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              FitPulse Pro
            </h2>
            <span className="badge badge-primary">{currentUser.role}</span>
          </div>
        </div>

        {canInstallPwa && (
          <button className="btn btn-primary" onClick={handleInstallPWA} style={{ fontSize: '0.8rem', width: '100%' }}>
            📱 Installer l'Application (PWA)
          </button>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('dashboard')} style={{ justifyContent: 'flex-start' }}>
            <Calendar size={18} /> Semaine & Planning
          </button>
          <button className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('templates')} style={{ justifyContent: 'flex-start' }}>
            <Dumbbell size={18} /> Pré-séances & Modèles
          </button>
          <button className={`btn ${activeTab === 'live' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => startLiveWorkout()} style={{ justifyContent: 'flex-start', background: activeTab === 'live' ? 'var(--secondary-gradient)' : undefined }}>
            <Play size={18} /> Séance à la Volée (Live)
          </button>
          <button className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('analytics')} style={{ justifyContent: 'flex-start' }}>
            <TrendingUp size={18} /> Progression & 1RM
          </button>
          <button className={`btn ${activeTab === 'measurements' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('measurements')} style={{ justifyContent: 'flex-start' }}>
            <LineChart size={18} /> Mensurations
          </button>
          <button className={`btn ${activeTab === 'exercises' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('exercises')} style={{ justifyContent: 'flex-start' }}>
            <Flame size={18} /> Base d'Exercices BDD
          </button>
          <button className={`btn ${activeTab === 'community' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('community')} style={{ justifyContent: 'flex-start' }}>
            <Users size={18} /> Partage & Communauté
          </button>
          {currentUser.role === 'admin' && (
            <button className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('admin'); handleLoadAdminUsers(); }} style={{ justifyContent: 'flex-start' }}>
              <Shield size={18} /> Admin Dashboard
            </button>
          )}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.full_name}</div>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ width: '100%', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <nav className="mobile-nav-bar">
        <button className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Calendar size={20} />
          <span>Planning</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
          <Dumbbell size={20} />
          <span>Pré-séances</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'live' ? 'active-live' : ''}`} onClick={() => startLiveWorkout()}>
          <Play size={22} color="var(--secondary-accent)" />
          <span style={{ color: 'var(--secondary-accent)', fontWeight: 700 }}>Live</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <TrendingUp size={20} />
          <span>Calcul 1RM</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'measurements' ? 'active' : ''}`} onClick={() => setActiveTab('measurements')}>
          <LineChart size={20} />
          <span>Tailles</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">

        {/* TAB 1: WEEKLY PLANNING */}
        {activeTab === 'dashboard' && weeklyData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Planning Salle & Semaine</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Suivez vos séances accomplies et à venir.</p>
              </div>
              {canInstallPwa && (
                <button className="btn btn-secondary" onClick={handleInstallPWA} style={{ fontSize: '0.85rem' }}>
                  📲 Installer FitPulse PWA
                </button>
              )}
              <button className="btn btn-primary" style={{ width: '100%', maxWidth: '240px' }} onClick={() => startLiveWorkout()}>
                <Play size={18} /> Lancer Séance à la Volée
              </button>
            </header>

            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(0,242,254,0.15)', borderRadius: '12px' }}>
                <Award size={28} color="var(--primary-accent)" />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{weeklyData.total_workouts}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Séances effectuées cette semaine</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={18} color="var(--success-accent)" /> Séances Accomplies
                </h3>
                {weeklyData.completed_sessions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucune séance enregistrée cette semaine.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {weeklyData.completed_sessions.map((sess: any) => (
                      <div key={sess.id} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sess.title}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(sess.start_time).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                  ⚡ Pré-séances Recommandées
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {weeklyData.suggested_templates.map((tpl: any) => (
                    <div key={tpl.id} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{tpl.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{tpl.description}</p>
                      <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => startLiveWorkout(tpl)}>
                        <Play size={14} /> Démarrer
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <BodyVisualizer primaryMuscles={['chest', 'quadriceps']} secondaryMuscles={['triceps', 'abs']} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRE-SEANCES */}
        {activeTab === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Pré-séances & Modèles</h1>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={18} color="var(--primary-accent)" /> Créer une Pré-séance
                </h3>
                <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Titre (ex: Push Pectoraux)</label>
                    <input className="input-field" value={newTplTitle} onChange={e => setNewTplTitle(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Description</label>
                    <textarea className="input-field" value={newTplDesc} onChange={e => setNewTplDesc(e.target.value)} rows={2} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Exercices inclus</label>
                    <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {exercisesList.map(ex => (
                        <label key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <input 
                            type="checkbox" 
                            checked={newTplSelectedEx.includes(ex.id)}
                            onChange={(e) => {
                              if (e.target.checked) setNewTplSelectedEx(prev => [...prev, ex.id]);
                              else setNewTplSelectedEx(prev => prev.filter(id => id !== ex.id));
                            }}
                          />
                          {ex.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Créer le Modèle</button>
                </form>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Mes Pré-séances</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {templatesList.map(tpl => (
                    <div key={tpl.id} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tpl.title}</h4>
                        {tpl.is_predefined_program && <span className="badge badge-warning">Prédéfini</span>}
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => startLiveWorkout(tpl)}>
                        <Play size={14} /> Lancer la Séance
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE WORKOUT MODE (MOBILE OPTIMIZED & GIANT TIMER) */}
        {activeTab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>⚡ Séance Live à la Salle</h1>
              </div>
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleFinishWorkout}>
                <Check size={18} /> Valider la Séance
              </button>
            </header>

            {/* Giant Visual Rest Timer Display */}
            {restSecondsLeft !== null && (
              <div className={`rest-timer-box ${restSecondsLeft === 0 ? 'alarm-active' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Timer size={36} color={restSecondsLeft === 0 ? 'var(--secondary-accent)' : 'var(--primary-accent)'} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {restSecondsLeft === 0 ? '🔔 TEMPS ÉCOULÉ ! REPARTIR' : 'CHRONO DE REPOS EN DIRECT'}
                    </div>
                    <div className="giant-timer-text">
                      {Math.floor(restSecondsLeft / 60)}:{(restSecondsLeft % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setIsTimerActive(!isTimerActive)}>
                    {isTimerActive ? 'Pause' : 'Relancer'}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setRestSecondsLeft(null)}>
                    Masquer
                  </button>
                </div>
              </div>
            )}

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nom de la Séance</label>
                <input className="input-field" value={liveTitle} onChange={e => setLiveTitle(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Poids Corporel (kg)</label>
                  <input type="number" step="0.1" className="input-field" placeholder="ex: 78.5" value={liveBodyWeight} onChange={e => setLiveBodyWeight(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Repas du jour</label>
                  <input className="input-field" placeholder="ex: Poulet Riz" value={liveMeals} onChange={e => setLiveMeals(e.target.value)} />
                </div>
              </div>

              {/* Exercises in live session */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.keys(liveSets).map((exIdStr) => {
                  const exId = Number(exIdStr);
                  const exObj = exercisesList.find(e => e.id === exId);
                  if (!exObj) return null;

                  return (
                    <div key={exId} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{exObj.name}</h3>
                        <span className="badge badge-primary">{exObj.category}</span>
                      </div>

                      {lastSessionData && (
                        <div style={{ background: 'rgba(0,242,254,0.08)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--primary-accent)', marginBottom: '0.5rem' }}>
                          📊 Session précédente relevée
                        </div>
                      )}

                      {/* Tactile Mobile Sets (Thumb Friendly) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {liveSets[exId].map((set, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: set.completed ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, width: '40px' }}>#{set.set_number}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <input 
                                type="number" 
                                className="input-field num-keypad-input" 
                                style={{ width: '65px', padding: '0.5rem', textAlign: 'center', fontWeight: 700 }} 
                                placeholder="Reps" 
                                value={set.reps_completed} 
                                onChange={(e) => updateSetDetail(exId, idx, 'reps_completed', e.target.value)} 
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>reps</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <input 
                                type="number" 
                                step="0.5"
                                className="input-field num-keypad-input" 
                                style={{ width: '70px', padding: '0.5rem', textAlign: 'center', fontWeight: 700 }} 
                                placeholder="Kg" 
                                value={set.weight_kg} 
                                onChange={(e) => updateSetDetail(exId, idx, 'weight_kg', e.target.value)} 
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>kg</span>
                            </div>
                            <button 
                              className={`btn btn-thumb ${set.completed ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ marginLeft: 'auto' }}
                              onClick={() => toggleSetComplete(exId, idx)}
                            >
                              {set.completed ? '✓ Fait' : 'Valider'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <BodyVisualizer primaryMuscles={activeMuscles} />
            </div>
          </div>
        )}

        {/* TAB 4: ANALYTICS & 1RM CALCULATOR */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Graphiques & Calculateur 1RM / RPE</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Évaluez votre force maximale théorique et préparez vos charges d'entraînement.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calculator size={20} color="var(--primary-accent)" /> Calculateur 1RM (Charge Max Théorique)
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Charge (kg)</label>
                    <input type="number" className="input-field" value={calcWeight} onChange={e => setCalcWeight(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Répétitions</label>
                    <input type="number" className="input-field" value={calcReps} onChange={e => setCalcReps(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>RPE (1-10)</label>
                    <input type="number" step="0.5" className="input-field" value={calcRpe} onChange={e => setCalcRpe(e.target.value)} />
                  </div>
                </div>

                <div style={{ background: 'rgba(0,242,254,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--primary-accent)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>VOTRE 1RM THÉORIQUE ESTIMÉ</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-accent)', margin: '0.2rem 0' }}>
                    {calculated1RM} <span style={{ fontSize: '1rem' }}>kg</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Basé sur la formule Epley certifiée pour le suivi de force.</div>
                </div>

                <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>95% 1RM</div>
                    <div style={{ fontWeight: 700 }}>{Math.round(calculated1RM * 0.95)} kg</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>85% 1RM</div>
                    <div style={{ fontWeight: 700 }}>{Math.round(calculated1RM * 0.85)} kg</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>75% 1RM</div>
                    <div style={{ fontWeight: 700 }}>{Math.round(calculated1RM * 0.75)} kg</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>65% 1RM</div>
                    <div style={{ fontWeight: 700 }}>{Math.round(calculated1RM * 0.65)} kg</div>
                  </div>
                </div>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} color="var(--success-accent)" /> Évolution du Poids Corporel (Sparkline)
                </h3>
                
                {measurementsList.length > 0 ? (
                  <div>
                    <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', paddingTop: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                      {measurementsList.slice(-10).map((m, idx) => {
                        const weight = m.weight_kg || 70;
                        const heightPct = Math.min(100, Math.max(20, (weight - 50) * 2));
                        return (
                          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{weight}k</span>
                            <div style={{ width: '100%', height: `${heightPct}%`, background: 'var(--primary-gradient)', borderRadius: '4px 4px 0 0' }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Enregistrez vos premières mensurations pour voir apparaître le graphique de progression.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MENSURATIONS */}
        {activeTab === 'measurements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Mensurations</h1>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Nouvelle Prise</h3>
                <form onSubmit={handleAddMeasurement} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Poids (kg)</label>
                    <input type="number" step="0.1" className="input-field" value={measWeight} onChange={e => setMeasWeight(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tour de Pectoraux (cm)</label>
                    <input type="number" step="0.5" className="input-field" value={measChest} onChange={e => setMeasChest(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tour de Ventre (cm)</label>
                    <input type="number" step="0.5" className="input-field" value={measWaist} onChange={e => setMeasWaist(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Enregistrer</button>
                </form>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Historique</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {measurementsList.map(m => (
                    <div key={m.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>{new Date(m.recorded_at).toLocaleDateString('fr-FR')}</span>
                      <span style={{ fontWeight: 700 }}>⚖️ {m.weight_kg || '-'} kg</span>
                      <span>Pecs: {m.chest_cm || '-'} cm</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EXERCISES CATALOG */}
        {activeTab === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Base d'Exercices Certifiés (+60 Exercices)</h1>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleEnrichCatalog} disabled={importingApi}>
                <Globe size={18} /> {importingApi ? 'Enrichissement en cours...' : 'Imprimer Tout le Catalogue Certifié (+60 Exercices)'}
              </button>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleOpenAiModal}>
                <Sparkles size={18} /> Ajouter via IA
              </button>
            </header>

            {aiModalOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={18} /> Générer des exercices via IA
                    </h3>
                    <button className="btn btn-secondary" onClick={() => setAiModalOpen(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      1. Copie ce prompt, complète-le, colle-le dans ton IA préférée (Claude, ChatGPT...)
                    </label>
                    <textarea
                      className="input-field"
                      style={{ width: '100%', minHeight: '160px', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.35rem' }}
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                    />
                    <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={handleCopyAiPrompt}>
                      <Copy size={16} /> Copier le prompt
                    </button>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      2. Colle ici la réponse JSON de l'IA
                    </label>
                    <textarea
                      className="input-field"
                      style={{ width: '100%', minHeight: '120px', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.35rem' }}
                      value={aiJsonInput}
                      onChange={e => setAiJsonInput(e.target.value)}
                      placeholder='[{"name": "...", "category": "Musculation", "primary_muscles": ["chest"], ...}]'
                    />
                    {aiParseError && <p style={{ color: '#ff0844', fontSize: '0.8rem', marginTop: '0.35rem' }}>{aiParseError}</p>}
                    <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={handleParseAiJson}>
                      Parser la réponse
                    </button>
                  </div>

                  {aiParsedExercises.length > 0 && (
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        3. Vérifie / édite avant de créer ({aiParsedExercises.length} exercice(s))
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.35rem' }}>
                        {aiParsedExercises.map((ex, idx) => (
                          <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                className="input-field"
                                style={{ flex: 1 }}
                                value={ex.name}
                                onChange={e => handleUpdateAiExercise(idx, { name: e.target.value })}
                              />
                              <button className="btn btn-secondary" onClick={() => handleRemoveAiExercise(idx)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <select
                                className="input-field"
                                style={{ flex: 1 }}
                                value={ex.category}
                                onChange={e => handleUpdateAiExercise(idx, { category: e.target.value })}
                              >
                                <option value="Musculation">Musculation</option>
                                <option value="Cardio">Cardio</option>
                              </select>
                              <select
                                className="input-field"
                                style={{ flex: 1 }}
                                value={ex.primary_muscles[0] || 'chest'}
                                onChange={e => handleUpdateAiExercise(idx, { primary_muscles: [e.target.value] })}
                              >
                                {VALID_MUSCLE_KEYS.map(key => (
                                  <option key={key} value={key}>{key}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '0.75rem' }}
                        onClick={handleCreateAiExercises}
                        disabled={aiCreating}
                      >
                        {aiCreating ? 'Création en cours...' : `Créer les ${aiParsedExercises.length} exercice(s)`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <div>
                <BodyVisualizer primaryMuscles={newExPrimary} selectedExerciseName={newExName} />
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Ajouter un Exercice Personnalisé</h3>
                <form onSubmit={handleCreateExercise} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nom (ex: Pompes Diamant)</label>
                    <input className="input-field" value={newExName} onChange={e => setNewExName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Catégorie</label>
                    <select className="input-field" value={newExCategory} onChange={e => setNewExCategory(e.target.value)}>
                      <option value="Musculation">Musculation</option>
                      <option value="Cardio">Cardio</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Muscle Principal</label>
                    <select className="input-field" onChange={e => setNewExPrimary([e.target.value])}>
                      <option value="chest">Pectoraux</option>
                      <option value="triceps">Triceps</option>
                      <option value="biceps">Biceps</option>
                      <option value="shoulders">Épaules</option>
                      <option value="back_lats">Dos</option>
                      <option value="quadriceps">Quadriceps</option>
                      <option value="abs">Abdominaux</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Créer l'Exercice</button>
                </form>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Exercices Disponibles dans la Base ({exercisesList.length})</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Cliquez sur un exercice pour afficher son ciblage anatomique dynamique sur la carte musculaire ci-dessus.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {exercisesList.map(ex => (
                    <div 
                      key={ex.id} 
                      onClick={() => {
                        setNewExPrimary(ex.primary_muscles || []);
                        setNewExName(ex.name);
                      }}
                      style={{ 
                        padding: '0.85rem', 
                        background: newExName === ex.name ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255,255,255,0.03)', 
                        borderRadius: '10px', 
                        border: newExName === ex.name ? '1px solid var(--primary-accent)' : '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                      className="exercise-card"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ex.name}</h4>
                        <span className="badge badge-primary">{ex.category}</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>{ex.description || 'Exercice configuré'}</p>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {ex.primary_muscles?.map((m: string) => (
                          <span key={m} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,8,68,0.2)', color: '#ff0844', border: '1px solid rgba(255,8,68,0.3)', textTransform: 'capitalize' }}>
                            🎯 {m}
                          </span>
                        ))}
                        {ex.secondary_muscles?.map((m: string) => (
                          <span key={m} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,171,0,0.2)', color: '#ffab00', border: '1px solid rgba(255,171,0,0.3)', textTransform: 'capitalize' }}>
                            ⚡ {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: COMMUNITY */}
        {activeTab === 'community' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Partage des Progressions</h1>
            </header>

            <div className="glass-panel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {communityList.map(sess => (
                  <div key={sess.id} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{sess.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Par {sess.user?.full_name || 'Athlète'}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(sess.start_time).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: ADMIN DASHBOARD */}
        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <header>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Gouvernance Admin</h1>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Créer un Compte Athlète</h3>
                <form onSubmit={handleCreateUserAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nom complet</label>
                    <input className="input-field" value={adminNewName} onChange={e => setAdminNewName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email</label>
                    <input type="email" className="input-field" value={adminNewEmail} onChange={e => setAdminNewEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mot de passe</label>
                    <input type="password" className="input-field" value={adminNewPassword} onChange={e => setAdminNewPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary">Créer le Compte</button>
                </form>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Utilisateurs Enregistrés</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {adminUsers.map(u => (
                    <div key={u.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                      </div>
                      <span className="badge badge-primary">{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
