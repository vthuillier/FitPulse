import React from 'react';

interface BodyVisualizerProps {
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  onSelectMuscle?: (muscle: string) => void;
  selectedExerciseName?: string;
  width?: number;
  height?: number;
  compact?: boolean;
}

export const BodyVisualizer: React.FC<BodyVisualizerProps> = ({
  primaryMuscles = [],
  secondaryMuscles = [],
  onSelectMuscle,
  selectedExerciseName,
  width = 340,
  height = 460,
  compact = false
}) => {
  const isPrimary = (muscle: string) => primaryMuscles.includes(muscle);
  const isSecondary = (muscle: string) => secondaryMuscles.includes(muscle);

  const getMuscleFill = (muscle: string) => {
    if (isPrimary(muscle)) return "#ff0844"; // Neon Red Primary
    if (isSecondary(muscle)) return "#ffab00"; // Neon Amber Secondary
    return "#1e293b"; // Dark Base
  };

  const getMuscleFilter = (muscle: string) => {
    if (isPrimary(muscle)) return "drop-shadow(0 0 10px #ff0844)";
    if (isSecondary(muscle)) return "drop-shadow(0 0 8px #ffab00)";
    return "none";
  };

  return (
    <div className={compact ? undefined : "glass-panel"} style={compact
      ? { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }
      : { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)', border: '1px solid rgba(0, 242, 254, 0.3)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }
    }>
      {!compact && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span>🦸</span> Carte Musculaire Anatomique 3D
          </h3>
          {selectedExerciseName ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--primary-accent)', fontWeight: 700, marginTop: '0.25rem' }}>
              Exercice Sélectionné: <span style={{ textDecoration: 'underline' }}>{selectedExerciseName}</span>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Cliquez sur un exercice ou un groupe musculaire pour visualiser l'impact
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: compact ? '0.5rem' : '2rem', justifyContent: 'center', alignItems: 'center' }}>
        {/* VUE FACE (FRONT) */}
        <div style={{ textAlign: 'center' }}>
          {!compact && <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-accent)', letterSpacing: '1px', textTransform: 'uppercase' }}>VUE FACE</span>}
          <svg width={width / 2} height={height} viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}>
            {/* Tête, cou, silhouette bassin/pieds (non-interactif) */}
            <circle cx="50" cy="14" r="9" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
            <rect x="45" y="21" width="10" height="7" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <path d="M 36 70 C 34 76 34 82 38 86 L 62 86 C 66 82 66 76 64 70 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
            <path d="M 40 175 L 44 175 L 45 184 L 34 184 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
            <path d="M 60 175 L 56 175 L 55 184 L 66 184 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>

            {/* Épaules (Deltoïdes Avant) */}
            <path d="M 30 28 C 24 29 19 38 21 47 C 23 51 30 47 31 39 C 32 34 33 30 30 28 Z"
              fill={getMuscleFill("shoulders")}
              filter={getMuscleFilter("shoulders")}
              stroke={isPrimary("shoulders") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("shoulders")}
            />
            <path d="M 70 28 C 76 29 81 38 79 47 C 77 51 70 47 69 39 C 68 34 67 30 70 28 Z"
              fill={getMuscleFill("shoulders")}
              filter={getMuscleFilter("shoulders")}
              stroke={isPrimary("shoulders") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("shoulders")}
            />

            {/* Pectoraux (Chest) */}
            <path d="M 32 32 C 31 40 32 47 40 51 C 45 49 48 44 48 33 C 43 30 36 30 32 32 Z"
              fill={getMuscleFill("chest")}
              filter={getMuscleFilter("chest")}
              stroke={isPrimary("chest") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("chest")}
            />
            <path d="M 68 32 C 69 40 68 47 60 51 C 55 49 52 44 52 33 C 57 30 64 30 68 32 Z"
              fill={getMuscleFill("chest")}
              filter={getMuscleFilter("chest")}
              stroke={isPrimary("chest") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("chest")}
            />

            {/* Obliques */}
            <path d="M 30 52 C 29 58 30 64 33 69 L 37 67 C 35 61 35 55 36 51 Z"
              fill={getMuscleFill("obliques")}
              filter={getMuscleFilter("obliques")}
              stroke={isPrimary("obliques") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("obliques")}
            />
            <path d="M 70 52 C 71 58 70 64 67 69 L 63 67 C 65 61 65 55 64 51 Z"
              fill={getMuscleFill("obliques")}
              filter={getMuscleFilter("obliques")}
              stroke={isPrimary("obliques") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("obliques")}
            />

            {/* Abdominaux (Abs) - grille 3x2 */}
            {[0, 1, 2].map((row) => (
              <React.Fragment key={`abs-row-${row}`}>
                <rect x="38" y={52 + row * 8} width="11" height="6.5" rx="2"
                  fill={getMuscleFill("abs")}
                  filter={getMuscleFilter("abs")}
                  stroke={isPrimary("abs") ? "#ffffff" : "#475569"} strokeWidth="0.75"
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  onClick={() => onSelectMuscle?.("abs")}
                />
                <rect x="51" y={52 + row * 8} width="11" height="6.5" rx="2"
                  fill={getMuscleFill("abs")}
                  filter={getMuscleFilter("abs")}
                  stroke={isPrimary("abs") ? "#ffffff" : "#475569"} strokeWidth="0.75"
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  onClick={() => onSelectMuscle?.("abs")}
                />
              </React.Fragment>
            ))}

            {/* Biceps */}
            <path d="M 19 44 C 16 48 16 60 20 65 C 24 63 25 50 23 44 Z"
              fill={getMuscleFill("biceps")}
              filter={getMuscleFilter("biceps")}
              stroke={isPrimary("biceps") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("biceps")}
            />
            <path d="M 81 44 C 84 48 84 60 80 65 C 76 63 75 50 77 44 Z"
              fill={getMuscleFill("biceps")}
              filter={getMuscleFilter("biceps")}
              stroke={isPrimary("biceps") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("biceps")}
            />

            {/* Avant-bras */}
            <path d="M 18 67 C 16 72 16 84 19 90 C 22 89 24 78 22 67 Z"
              fill={getMuscleFill("forearms")}
              filter={getMuscleFilter("forearms")}
              stroke={isPrimary("forearms") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("forearms")}
            />
            <path d="M 82 67 C 84 72 84 84 81 90 C 78 89 76 78 78 67 Z"
              fill={getMuscleFill("forearms")}
              filter={getMuscleFilter("forearms")}
              stroke={isPrimary("forearms") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("forearms")}
            />

            {/* Quadriceps (Jambes Face) */}
            <path d="M 37 88 C 33 100 32 116 34 132 L 47 132 C 48 116 47 100 46 88 Z"
              fill={getMuscleFill("quadriceps")}
              filter={getMuscleFilter("quadriceps")}
              stroke={isPrimary("quadriceps") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("quadriceps")}
            />
            <path d="M 63 88 C 67 100 68 116 66 132 L 53 132 C 52 116 53 100 54 88 Z"
              fill={getMuscleFill("quadriceps")}
              filter={getMuscleFilter("quadriceps")}
              stroke={isPrimary("quadriceps") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("quadriceps")}
            />

            {/* Mollets Face */}
            <path d="M 35 138 C 33 148 33 162 36 173 L 43 173 C 44 162 44 148 43 138 Z"
              fill={getMuscleFill("calves")}
              filter={getMuscleFilter("calves")}
              stroke={isPrimary("calves") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("calves")}
            />
            <path d="M 65 138 C 67 148 67 162 64 173 L 57 173 C 56 162 56 148 57 138 Z"
              fill={getMuscleFill("calves")}
              filter={getMuscleFilter("calves")}
              stroke={isPrimary("calves") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("calves")}
            />
          </svg>
        </div>

        {/* VUE DOS (BACK) */}
        <div style={{ textAlign: 'center' }}>
          {!compact && <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-accent)', letterSpacing: '1px', textTransform: 'uppercase' }}>VUE DOS</span>}
          <svg width={width / 2} height={height} viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}>
            {/* Tête, cou, silhouette bassin/pieds (non-interactif) */}
            <circle cx="50" cy="14" r="9" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
            <rect x="45" y="21" width="10" height="7" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <path d="M 40 175 L 44 175 L 45 184 L 34 184 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
            <path d="M 60 175 L 56 175 L 55 184 L 66 184 Z" fill="#1e293b" stroke="#334155" strokeWidth="1"/>

            {/* Trapèzes (haut du dos) */}
            <path d="M 38 28 L 62 28 C 63 34 58 42 50 45 C 42 42 37 34 38 28 Z"
              fill={getMuscleFill("trapezius")}
              filter={getMuscleFilter("trapezius")}
              stroke={isPrimary("trapezius") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("trapezius")}
            />

            {/* Grand Dorsal (Lats) */}
            <path d="M 30 40 C 26 48 27 62 34 72 L 44 68 C 43 58 43 46 40 39 Z"
              fill={getMuscleFill("back_lats")}
              filter={getMuscleFilter("back_lats")}
              stroke={isPrimary("back_lats") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("back_lats")}
            />
            <path d="M 70 40 C 74 48 73 62 66 72 L 56 68 C 57 58 57 46 60 39 Z"
              fill={getMuscleFill("back_lats")}
              filter={getMuscleFilter("back_lats")}
              stroke={isPrimary("back_lats") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("back_lats")}
            />

            {/* Triceps (Bras Dos) */}
            <path d="M 19 44 C 16 48 16 60 20 65 C 24 63 25 50 23 44 Z"
              fill={getMuscleFill("triceps")}
              filter={getMuscleFilter("triceps")}
              stroke={isPrimary("triceps") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("triceps")}
            />
            <path d="M 81 44 C 84 48 84 60 80 65 C 76 63 75 50 77 44 Z"
              fill={getMuscleFill("triceps")}
              filter={getMuscleFilter("triceps")}
              stroke={isPrimary("triceps") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("triceps")}
            />

            {/* Avant-bras */}
            <path d="M 18 67 C 16 72 16 84 19 90 C 22 89 24 78 22 67 Z"
              fill={getMuscleFill("forearms")}
              filter={getMuscleFilter("forearms")}
              stroke={isPrimary("forearms") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("forearms")}
            />
            <path d="M 82 67 C 84 72 84 84 81 90 C 78 89 76 78 78 67 Z"
              fill={getMuscleFill("forearms")}
              filter={getMuscleFilter("forearms")}
              stroke={isPrimary("forearms") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("forearms")}
            />

            {/* Fessiers (Glutes) */}
            <path d="M 36 86 C 33 88 32 96 34 102 C 37 106 44 106 47 102 L 47 87 C 44 85 39 85 36 86 Z"
              fill={getMuscleFill("glutes")}
              filter={getMuscleFilter("glutes")}
              stroke={isPrimary("glutes") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("glutes")}
            />
            <path d="M 64 86 C 67 88 68 96 66 102 C 63 106 56 106 53 102 L 53 87 C 56 85 61 85 64 86 Z"
              fill={getMuscleFill("glutes")}
              filter={getMuscleFilter("glutes")}
              stroke={isPrimary("glutes") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("glutes")}
            />

            {/* Ischio-jambiers (Hamstrings) */}
            <path d="M 35 104 C 33 114 33 124 35 132 L 46 132 C 47 124 47 114 46 104 Z"
              fill={getMuscleFill("hamstrings")}
              filter={getMuscleFilter("hamstrings")}
              stroke={isPrimary("hamstrings") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("hamstrings")}
            />
            <path d="M 65 104 C 67 114 67 124 65 132 L 54 132 C 53 124 53 114 54 104 Z"
              fill={getMuscleFill("hamstrings")}
              filter={getMuscleFilter("hamstrings")}
              stroke={isPrimary("hamstrings") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("hamstrings")}
            />

            {/* Mollets Dos (Calves) */}
            <path d="M 35 138 C 33 148 33 162 36 173 L 43 173 C 44 162 44 148 43 138 Z"
              fill={getMuscleFill("calves")}
              filter={getMuscleFilter("calves")}
              stroke={isPrimary("calves") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("calves")}
            />
            <path d="M 65 138 C 67 148 67 162 64 173 L 57 173 C 56 162 56 148 57 138 Z"
              fill={getMuscleFill("calves")}
              filter={getMuscleFilter("calves")}
              stroke={isPrimary("calves") ? "#ffffff" : "#475569"} strokeWidth="1"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onClick={() => onSelectMuscle?.("calves")}
            />
          </svg>
        </div>
      </div>

      {/* Légende Stylisée */}
      {!compact && (
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff0844', boxShadow: '0 0 10px #ff0844' }}></span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Muscle Principal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ffab00', boxShadow: '0 0 8px #ffab00' }}></span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Secondaire</span>
          </div>
        </div>
      )}
    </div>
  );
};

