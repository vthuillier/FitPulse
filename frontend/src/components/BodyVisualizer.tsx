import React from 'react';

interface BodyVisualizerProps {
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  onSelectMuscle?: (muscle: string) => void;
  width?: number;
  height?: number;
}

export const BodyVisualizer: React.FC<BodyVisualizerProps> = ({
  primaryMuscles = [],
  secondaryMuscles = [],
  onSelectMuscle,
  width = 280,
  height = 420
}) => {
  const isPrimary = (muscle: string) => primaryMuscles.includes(muscle);
  const isSecondary = (muscle: string) => secondaryMuscles.includes(muscle);

  const getMuscleFill = (muscle: string) => {
    if (isPrimary(muscle)) return "#ff0844"; // Red glowing active primary
    if (isSecondary(muscle)) return "#ffab00"; // Yellow active secondary
    return "#2a364f"; // Base dark inactive
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🦸</span> Carte Musculaire Ciblée
      </h3>

      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
        {/* VUE FACE (FRONT) */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>FACE</p>
          <svg width={width / 2} height={height} viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Tête */}
            <circle cx="50" cy="18" r="10" fill="#1e293b" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
            {/* Cou */}
            <rect x="46" y="28" width="8" height="6" fill="#1e293b" />
            
            {/* Épaules (Deltoïdes Avant) */}
            <path d="M 30 34 C 28 34 22 42 24 50 C 26 52 32 46 32 40 Z" 
              fill={getMuscleFill("shoulders")} 
              className={`muscle-group ${isPrimary("shoulders") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("shoulders")}
            />
            <path d="M 70 34 C 72 34 78 42 76 50 C 74 52 68 46 68 40 Z" 
              fill={getMuscleFill("shoulders")} 
              className={`muscle-group ${isPrimary("shoulders") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("shoulders")}
            />

            {/* Pectoraux (Chest) */}
            <path d="M 33 38 H 49 V 54 C 42 54 34 50 33 38 Z" 
              fill={getMuscleFill("chest")} 
              className={`muscle-group ${isPrimary("chest") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("chest")}
            />
            <path d="M 51 38 H 67 C 66 50 58 54 51 54 V 38 Z" 
              fill={getMuscleFill("chest")} 
              className={`muscle-group ${isPrimary("chest") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("chest")}
            />

            {/* Abdominaux (Abs) */}
            <rect x="41" y="56" width="18" height="24" rx="3"
              fill={getMuscleFill("abs")} 
              className={`muscle-group ${isPrimary("abs") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("abs")}
            />

            {/* Biceps */}
            <path d="M 22 52 C 20 54 20 66 24 68 C 27 66 27 54 24 52 Z" 
              fill={getMuscleFill("biceps")} 
              className={`muscle-group ${isPrimary("biceps") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("biceps")}
            />
            <path d="M 78 52 C 80 54 80 66 76 68 C 73 66 73 54 76 52 Z" 
              fill={getMuscleFill("biceps")} 
              className={`muscle-group ${isPrimary("biceps") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("biceps")}
            />

            {/* Avant-bras */}
            <path d="M 18 70 L 23 70 L 21 90 L 17 90 Z" fill="#1e293b"/>
            <path d="M 82 70 L 77 70 L 79 90 L 83 90 Z" fill="#1e293b"/>

            {/* Quadriceps (Jambes Face) */}
            <path d="M 34 84 L 48 84 L 46 130 L 36 130 Z" 
              fill={getMuscleFill("quadriceps")} 
              className={`muscle-group ${isPrimary("quadriceps") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("quadriceps")}
            />
            <path d="M 52 84 L 66 84 L 64 130 L 54 130 Z" 
              fill={getMuscleFill("quadriceps")} 
              className={`muscle-group ${isPrimary("quadriceps") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("quadriceps")}
            />

            {/* Mollets Face */}
            <path d="M 37 136 L 45 136 L 43 170 L 39 170 Z" fill="#1e293b"/>
            <path d="M 63 136 L 55 136 L 57 170 L 61 170 Z" fill="#1e293b"/>
          </svg>
        </div>

        {/* VUE DOS (BACK) */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>DOS</p>
          <svg width={width / 2} height={height} viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Tête & Cou Back */}
            <circle cx="50" cy="18" r="10" fill="#1e293b" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
            <rect x="46" y="28" width="8" height="6" fill="#1e293b" />

            {/* Trapèzes / Haut du dos */}
            <path d="M 36 34 L 64 34 L 58 48 L 42 48 Z" 
              fill={getMuscleFill("back_lats")} 
              className={`muscle-group ${isPrimary("back_lats") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("back_lats")}
            />

            {/* Grand Dorsal (Lats) */}
            <path d="M 30 46 L 44 48 L 42 75 L 34 70 Z" 
              fill={getMuscleFill("back_lats")} 
              className={`muscle-group ${isPrimary("back_lats") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("back_lats")}
            />
            <path d="M 70 46 L 56 48 L 58 75 L 66 70 Z" 
              fill={getMuscleFill("back_lats")} 
              className={`muscle-group ${isPrimary("back_lats") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("back_lats")}
            />

            {/* Triceps (Bras Dos) */}
            <path d="M 22 50 C 20 54 20 66 24 68 C 27 66 27 54 24 50 Z" 
              fill={getMuscleFill("triceps")} 
              className={`muscle-group ${isPrimary("triceps") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("triceps")}
            />
            <path d="M 78 50 C 80 54 80 66 76 68 C 73 66 73 54 76 50 Z" 
              fill={getMuscleFill("triceps")} 
              className={`muscle-group ${isPrimary("triceps") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("triceps")}
            />

            {/* Fessiers (Glutes) */}
            <path d="M 34 82 C 34 78 48 78 49 82 L 49 100 C 40 100 34 94 34 82 Z" 
              fill={getMuscleFill("glutes")} 
              className={`muscle-group ${isPrimary("glutes") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("glutes")}
            />
            <path d="M 66 82 C 66 78 52 78 51 82 L 51 100 C 60 100 66 94 66 82 Z" 
              fill={getMuscleFill("glutes")} 
              className={`muscle-group ${isPrimary("glutes") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("glutes")}
            />

            {/* Ischio-jambiers (Hamstrings) */}
            <path d="M 35 102 L 48 102 L 46 132 L 37 132 Z" 
              fill={getMuscleFill("hamstrings")} 
              className={`muscle-group ${isPrimary("hamstrings") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("hamstrings")}
            />
            <path d="M 65 102 L 52 102 L 54 132 L 63 132 Z" 
              fill={getMuscleFill("hamstrings")} 
              className={`muscle-group ${isPrimary("hamstrings") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("hamstrings")}
            />

            {/* Mollets Dos (Calves) */}
            <path d="M 36 136 L 46 136 L 43 170 L 38 170 Z" 
              fill={getMuscleFill("calves")} 
              className={`muscle-group ${isPrimary("calves") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("calves")}
            />
            <path d="M 64 136 L 54 136 L 57 170 L 62 170 Z" 
              fill={getMuscleFill("calves")} 
              className={`muscle-group ${isPrimary("calves") ? "active" : ""}`}
              onClick={() => onSelectMuscle?.("calves")}
            />
          </svg>
        </div>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff0844', boxShadow: '0 0 6px #ff0844' }}></span>
          <span>Cible Principale</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ffab00', boxShadow: '0 0 6px #ffab00' }}></span>
          <span>Secondaire</span>
        </div>
      </div>
    </div>
  );
};
