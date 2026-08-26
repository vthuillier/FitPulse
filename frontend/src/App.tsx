import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Activity, Dumbbell, Calendar, LineChart, Users, Shield, 
  Play, Plus, Check, Flame, Award
} from 'lucide-react';
import { BodyVisualizer } from './components/BodyVisualizer';
import { 
  loginApi, fetchCurrentProfile, fetchExercises, createExerciseApi, 
  fetchTemplates, createTemplateApi, fetchWeeklySummary, fetchLastWorkoutByTemplate,
  saveWorkoutSessionApi, fetchMeasurements, createMeasurementApi, 
  fetchCommunityFeed, fetchAllUsersAdmin, createUserAdminApi 
} from './services/api';

export function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('fitpulse_token'));
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'live' | 'measurements' | 'exercises' | 'community' | 'admin'>('dashboard');

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

  // Live workout mode state
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [lastSessionData, setLastSessionData] = useState<any>(null);
  const [liveTitle, setLiveTitle] = useState('Séance à la volée');
  const [liveBodyWeight, setLiveBodyWeight] = useState('');
  const [liveMeals, setLiveMeals] = useState('');
  const [liveNotes, setLiveNotes] = useState('');
  const [liveSets, setLiveSets] = useState<{ [exId: number]: any[] }>({});

  // New Exercise Form State
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState('Musculation');
  const [newExMetric] = useState('reps_weight');
  const [newExRest, setNewExRest] = useState(60);
  const [newExPrimary, setNewExPrimary] = useState<string[]>(['chest']);

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
      updatedEx[setIdx] = { ...updatedEx[setIdx], completed: !updatedEx[setIdx].completed };
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

  // Render Login Page if not authenticated
  if (!token || !currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(0,242,254,0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
            <Activity size={40} color="var(--primary-accent)" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>FitPulse Pro</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Plateforme hautement sécurisée de tracking & d'optimisation sportive
          </p>

          {loginError && (
            <div style={{ background: 'rgba(255,8,68,0.15)', border: '1px solid #ff0844', color: '#ff0844', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Email Admin / Athlète</label>
              <input 
                type="email" 
                className="input-field" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)}
                required 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>Mot de passe</label>
              <input 
                type="password" 
                className="input-field" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
              Se Connecter
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔒 Inscriptions publiques fermées. Accès géré par l'Administrateur.
          </div>
        </div>
      </div>
    );
  }

  // Active muscle groups calculation for preview
  const activeMuscles = activeTemplate?.template_items?.flatMap((i: any) => i.exercise.primary_muscles) || [];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
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
          <button className={`btn ${activeTab === 'measurements' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('measurements')} style={{ justifyContent: 'flex-start' }}>
            <LineChart size={18} /> Mensurations
          </button>
          <button className={`btn ${activeTab === 'exercises' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('exercises')} style={{ justifyContent: 'flex-start' }}>
            <Flame size={18} /> Base d'Exercices BDD
          </button>
          <button className={`btn ${activeTab === 'community' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('community')} style={{ justifyContent: 'flex-start' }}>
            <Users size={18} /> Partage & Progression
          </button>
          {currentUser.role === 'admin' && (
            <button className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('admin'); handleLoadAdminUsers(); }} style={{ justifyContent: 'flex-start' }}>
              <Shield size={18} /> Admin Dashboard
            </button>
          )}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.full_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{currentUser.email}</div>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ width: '100%', fontSize: '0.8rem' }}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">

        {/* TAB 1: WEEKLY PLANNING & DASHBOARD */}
        {activeTab === 'dashboard' && weeklyData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Planning Hebdomadaire</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Aperçu de ce que vous avez réalisé et des séances suggérées.</p>
              </div>
              <button className="btn btn-primary" onClick={() => startLiveWorkout()}>
                <Play size={18} /> Lancer Séance à la Volée
              </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {/* Stat Card 1 */}
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(0,242,254,0.15)', borderRadius: '12px' }}>
                  <Award size={32} color="var(--primary-accent)" />
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{weeklyData.total_workouts}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Séances effectuées cette semaine</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              {/* Left Column: Workouts completed */}
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={20} color="var(--success-accent)" /> Séances Accomplies la Semaine
                </h3>
                {weeklyData.completed_sessions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aucune séance enregistrée cette semaine. Lancez votre première séance !</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {weeklyData.completed_sessions.map((sess: any) => (
                      <div key={sess.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontWeight: 700 }}>{sess.title}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(sess.start_time).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {sess.body_weight_kg && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>⚖️ Poids du jour: {sess.body_weight_kg} kg</div>}
                        {sess.meals_logged && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🥗 Nutrition: {sess.meals_logged}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{ fontSize: '1.2rem', marginTop: '2rem', marginBottom: '1rem' }}>
                  ⚡ Séances Disponibles / Modèles (Recommandés)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {weeklyData.suggested_templates.map((tpl: any) => (
                    <div key={tpl.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{tpl.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{tpl.description}</p>
                      <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => startLiveWorkout(tpl)}>
                        <Play size={14} /> Lancer cette Séance
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Visualizer Preview */}
              <div>
                <BodyVisualizer primaryMuscles={['chest', 'quadriceps']} secondaryMuscles={['triceps', 'abs']} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEMPLATES & PRE-SEANCES */}
        {activeTab === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Modèles de Pré-séances & Programmes</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Créez vos pré-séances (ex: Push, Pull, Legs) ou suivez les programmes prédéfinis.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Créer un modèle */}
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={20} color="var(--primary-accent)" /> Créer une Pré-séance Personnalisée
                </h3>
                <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Titre (ex: Séance Push / Cardio High)</label>
                    <input className="input-field" value={newTplTitle} onChange={e => setNewTplTitle(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description</label>
                    <textarea className="input-field" value={newTplDesc} onChange={e => setNewTplDesc(e.target.value)} rows={2} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Sélectionner les exercices de la pré-séance</label>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {exercisesList.map(ex => (
                        <label key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={newTplSelectedEx.includes(ex.id)}
                            onChange={(e) => {
                              if (e.target.checked) setNewTplSelectedEx(prev => [...prev, ex.id]);
                              else setNewTplSelectedEx(prev => prev.filter(id => id !== ex.id));
                            }}
                          />
                          {ex.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({ex.category})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Enregistrer la Pré-séance</button>
                </form>
              </div>

              {/* Mes Pré-séances */}
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Mes Pré-séances & Programmes Enregistrés</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {templatesList.map(tpl => (
                    <div key={tpl.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontWeight: 700 }}>{tpl.title}</h4>
                        {tpl.is_predefined_program && <span className="badge badge-warning">Programme Prédéfini</span>}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{tpl.description}</p>
                      <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }} onClick={() => startLiveWorkout(tpl)}>
                        <Play size={16} /> Lancer la Séance
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE WORKOUT MODE */}
        {activeTab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>⚡ Mode Séance en Direct</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Consignez vos reps, poids, et comparez vos perfs avec l'ancienne séance !</p>
              </div>
              <button className="btn btn-danger" onClick={handleFinishWorkout}>
                <Check size={18} /> Valider & Terminer la Séance
              </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nom de la Séance</label>
                  <input className="input-field" value={liveTitle} onChange={e => setLiveTitle(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Poids du jour (kg)</label>
                    <input type="number" step="0.1" className="input-field" placeholder="ex: 78.5" value={liveBodyWeight} onChange={e => setLiveBodyWeight(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Repas / Calories du jour</label>
                    <input className="input-field" placeholder="ex: 2800 kcal - Poulet Riz" value={liveMeals} onChange={e => setLiveMeals(e.target.value)} />
                  </div>
                </div>

                {/* Exercises list in live mode */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {Object.keys(liveSets).map((exIdStr) => {
                    const exId = Number(exIdStr);
                    const exObj = exercisesList.find(e => e.id === exId);
                    if (!exObj) return null;

                    return (
                      <div key={exId} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{exObj.name}</h3>
                          <span className="badge badge-primary">{exObj.category}</span>
                        </div>

                        {/* Comparative previous session hint */}
                        {lastSessionData && (
                          <div style={{ background: 'rgba(0,242,254,0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--primary-accent)', marginBottom: '0.75rem' }}>
                            📊 Ancienne Séance : Fait précédemment sur cette séance.
                          </div>
                        )}

                        {/* Sets table */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {liveSets[exId].map((set, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: set.completed ? 'rgba(0,230,118,0.1)' : 'transparent', padding: '0.4rem', borderRadius: '6px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, width: '60px' }}>Série {set.set_number}</span>
                              <input 
                                type="number" 
                                className="input-field" 
                                style={{ width: '80px', padding: '0.4rem' }} 
                                placeholder="Reps" 
                                value={set.reps_completed} 
                                onChange={(e) => updateSetDetail(exId, idx, 'reps_completed', e.target.value)} 
                              />
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>reps x</span>
                              <input 
                                type="number" 
                                step="0.5"
                                className="input-field" 
                                style={{ width: '90px', padding: '0.4rem' }} 
                                placeholder="Kg" 
                                value={set.weight_kg} 
                                onChange={(e) => updateSetDetail(exId, idx, 'weight_kg', e.target.value)} 
                              />
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kg</span>
                              <button 
                                className={`btn ${set.completed ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: 'auto' }}
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

              {/* Right column: Target Body Heatmap */}
              <div>
                <BodyVisualizer primaryMuscles={activeMuscles} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MENSURATIONS */}
        {activeTab === 'measurements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Suivi des Mensurations</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Suivez la progression de votre poids et vos mensurations musculaires.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Nouvelle Prise</h3>
                <form onSubmit={handleAddMeasurement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Poids (kg)</label>
                    <input type="number" step="0.1" className="input-field" value={measWeight} onChange={e => setMeasWeight(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tour de Pectoraux (cm)</label>
                    <input type="number" step="0.5" className="input-field" value={measChest} onChange={e => setMeasChest(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tour de Taille / Ventre (cm)</label>
                    <input type="number" step="0.5" className="input-field" value={measWaist} onChange={e => setMeasWaist(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tour de Biceps (cm)</label>
                    <input type="number" step="0.5" className="input-field" value={measBiceps} onChange={e => setMeasBiceps(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary">Enregistrer Mensuration</button>
                </form>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Historique des Relevés</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                      <th style={{ padding: '0.75rem' }}>Poids (kg)</th>
                      <th style={{ padding: '0.75rem' }}>Pecs (cm)</th>
                      <th style={{ padding: '0.75rem' }}>Ventre (cm)</th>
                      <th style={{ padding: '0.75rem' }}>Biceps (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurementsList.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.75rem' }}>{new Date(m.recorded_at).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700 }}>{m.weight_kg || '-'}</td>
                        <td style={{ padding: '0.75rem' }}>{m.chest_cm || '-'}</td>
                        <td style={{ padding: '0.75rem' }}>{m.waist_cm || '-'}</td>
                        <td style={{ padding: '0.75rem' }}>{m.biceps_cm || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EXERCISES DATABASE */}
        {activeTab === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Base de Données des Exercices</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Consultez la liste des exercices configurés ou ajoutez-en des nouveaux.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Ajouter un Exercice "Configuré"</h3>
                <form onSubmit={handleCreateExercise} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nom (ex: Pompes Diamant)</label>
                    <input className="input-field" value={newExName} onChange={e => setNewExName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Catégorie</label>
                    <select className="input-field" value={newExCategory} onChange={e => setNewExCategory(e.target.value)}>
                      <option value="Musculation">Musculation</option>
                      <option value="Cardio">Cardio</option>
                      <option value="Stretches">Stretches</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Temps de repos par défaut (secondes)</label>
                    <input type="number" className="input-field" value={newExRest} onChange={e => setNewExRest(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Muscle Principal Cible</label>
                    <select className="input-field" onChange={e => setNewExPrimary([e.target.value])}>
                      <option value="chest">Pectoraux (Chest)</option>
                      <option value="triceps">Triceps</option>
                      <option value="biceps">Biceps</option>
                      <option value="shoulders">Épaules (Shoulders)</option>
                      <option value="back_lats">Dos (Back)</option>
                      <option value="quadriceps">Quadriceps</option>
                      <option value="abs">Abdominaux (Abs)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Créer Exercice BDD</button>
                </form>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Exercices Disponibles</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  {exercisesList.map(ex => (
                    <div key={ex.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontWeight: 700 }}>{ex.name}</h4>
                        <span className="badge badge-primary">{ex.category}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{ex.description || 'Exercice configuré standard'}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ Repos: {ex.default_rest_seconds}s</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: COMMUNITY & PROGRESS SHARING */}
        {activeTab === 'community' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Partage des Progressions</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Découvrez les séances récentes accomplies par vos partenaires d'entraînement.</p>
            </header>

            <div className="glass-panel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {communityList.map(sess => (
                  <div key={sess.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{sess.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Fait le {new Date(sess.start_time).toLocaleDateString('fr-FR')} • {sess.exercises_done.length} exercices réalisés
                      </p>
                    </div>
                    <span className="badge badge-primary">Progression Partagée</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ADMIN DASHBOARD */}
        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Dashboard Administrateur</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Gestion exclusive des comptes athlètes et surveillance globale.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Créer un Compte Athlète</h3>
                <form onSubmit={handleCreateUserAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nom complet</label>
                    <input className="input-field" value={adminNewName} onChange={e => setAdminNewName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email</label>
                    <input type="email" className="input-field" value={adminNewEmail} onChange={e => setAdminNewEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mot de passe</label>
                    <input type="password" className="input-field" value={adminNewPassword} onChange={e => setAdminNewPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary">Créer le Compte</button>
                </form>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Tous les Athlètes & Comptes</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem' }}>ID</th>
                      <th style={{ padding: '0.75rem' }}>Nom</th>
                      <th style={{ padding: '0.75rem' }}>Email</th>
                      <th style={{ padding: '0.75rem' }}>Rôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.75rem' }}>{u.id}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700 }}>{u.full_name}</td>
                        <td style={{ padding: '0.75rem' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>{u.role}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
