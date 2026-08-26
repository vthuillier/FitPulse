const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export function getAuthHeaders() {
  const token = localStorage.getItem("fitpulse_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function loginApi(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Erreur de connexion");
  }
  return res.json();
}

export async function fetchCurrentProfile() {
  const res = await fetch(`${API_URL}/users/me`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Non authentifié");
  return res.json();
}

export async function fetchExercises() {
  const res = await fetch(`${API_URL}/exercises/`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Erreur chargement exercices");
  return res.json();
}

export async function createExerciseApi(exercise: any) {
  const res = await fetch(`${API_URL}/exercises/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(exercise)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Erreur création exercice");
  }
  return res.json();
}

export async function deleteExerciseApi(exerciseId: number) {
  const res = await fetch(`${API_URL}/exercises/${exerciseId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur suppression exercice");
  }
}

export async function enrichCatalogApi() {
  const res = await fetch(`${API_URL}/exercises/enrich-catalog`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Erreur lors de l'enrichissement du catalogue");
  }
  return res.json();
}

export async function fetchTemplates() {
  const res = await fetch(`${API_URL}/templates/`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Erreur chargement pré-séances");
  return res.json();
}

export async function createTemplateApi(templateData: any) {
  const res = await fetch(`${API_URL}/templates/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(templateData)
  });
  if (!res.ok) throw new Error("Erreur création pré-séance");
  return res.json();
}

export async function updateTemplateApi(templateId: number, templateData: any) {
  const res = await fetch(`${API_URL}/templates/${templateId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(templateData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur modification pré-séance");
  }
  return res.json();
}

export async function fetchWeeklySummary() {
  const res = await fetch(`${API_URL}/workouts/weekly-summary`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Erreur chargement planning hebdo");
  return res.json();
}

export async function fetchLastWorkoutByTemplate(templateId: number) {
  const res = await fetch(`${API_URL}/workouts/last-by-template/${templateId}`, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function saveWorkoutSessionApi(sessionData: any) {
  const res = await fetch(`${API_URL}/workouts/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(sessionData)
  });
  if (!res.ok) throw new Error("Erreur sauvegarde séance");
  return res.json();
}

export async function deleteTemplateApi(templateId: number) {
  const res = await fetch(`${API_URL}/templates/${templateId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur suppression pré-séance");
  }
}

export async function fetchMeasurements() {
  const res = await fetch(`${API_URL}/measurements/`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Erreur mensurations");
  return res.json();
}

export async function createMeasurementApi(meas: any) {
  const res = await fetch(`${API_URL}/measurements/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(meas)
  });
  if (!res.ok) throw new Error("Erreur enregistrement mensuration");
  return res.json();
}

export async function fetchCommunityFeed() {
  const res = await fetch(`${API_URL}/workouts/community`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Erreur fil communautaire");
  return res.json();
}

export async function fetchAllUsersAdmin() {
  const res = await fetch(`${API_URL}/users/`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Erreur admin liste membres");
  return res.json();
}

export async function createUserAdminApi(userData: any) {
  const res = await fetch(`${API_URL}/users/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Erreur création utilisateur par Admin");
  }
  return res.json();
}
