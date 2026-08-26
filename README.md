# FitPulse Pro - Application de Tracking & Optimisation de Séances de Sport

FitPulse Pro est une application web complète et hautement sécurisée pour le suivi et l'optimisation des séances d'entraînement, des mensurations corporelles, du suivi nutritionnel et des objectifs sportifs (musculation, cardio, etc.).

## 🚀 Fonctionnalités
- **Visualiseur anatomique interactif (Homme découpé en zones musculaires)** : Visualisez en direct les muscles ciblés par vos exercices.
- **Gestion des Exercices Pré-configurés & Personnalisés** : Exercices pré-enregistrés (ex: Pompes diamant, Squat, Développé couché) avec types de séries (reps/poids ou temps/repos).
- **Modèles de Séances (Pré-séances)** : Créez vos routines (Push, Pull, Legs, Cardio) et réutilisez-les ou lancez une séance à la volée.
- **Programmes Prédéfinis** : Modèles d'entraînement hebdomadaires pré-configurés (ex: Cardio Évolution).
- **Mode Séance en Direct (Live Workout)** : Suivi en direct avec comparaison avec la séance précédente et saisie du poids et des repas du jour.
- **Organiseur & Historique** : Suivi des séances accomplies et suggérées dans la semaine.
- **Suivi des Mensurations & Progression** : Poids, tour de poitrine, tour de ventre/taille, tour de bras avec suivi temporel.
- **Sécurité et Multi-utilisateurs contrôlé** : Inscription publique désactivée. Gestion stricte par compte Admin et partage sécurisé de la progression entre membres.
- **Conteneurisation Docker & Tests Unitaires** : Environnement complet avec Docker Compose, PostgreSQL et suite de tests Pytest.

## 🛠️ Stack Technique
- **Backend** : FastAPI, SQLAlchemy (Async), Pydantic v2, Pytest, JWT, Passlib (Argon2).
- **Frontend** : React, Vite, TypeScript, Canvas/SVG Anatomique interactif, Vanilla CSS Glassmorphism.
- **Base de Données** : PostgreSQL.
- **Conteneurisation** : Docker & Docker Compose.

## 🏃 Déploiement rapide avec Docker
```bash
docker-compose up --build
```
L'application frontend sera accessible sur `http://localhost:3000` et le backend API sur `http://localhost:8000`.
