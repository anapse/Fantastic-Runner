import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewportContainer } from './components/ViewportContainer';
import { GameCanvas } from './components/GameCanvas';
import { HUDOverlay } from './components/HUDOverlay';
import { MainMenu } from './components/MainMenu';
import { NameInputModal } from './components/NameInputModal';
import { ShopModal } from './components/ShopModal';
import { CharacterModal } from './components/CharacterModal';
import { PowerupsModal } from './components/PowerupsModal';
import { AchievementsModal } from './components/AchievementsModal';
import { RankingModal } from './components/RankingModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { ComoJugarModal } from './components/ComoJugarModal';
import { ContactanosModal } from './components/ContactanosModal';
import { AdminDashboard } from './components/AdminDashboard';

import { GameEngine } from './game/engine';
import { GameMode, PlayerStats } from './game/types';
import { loadPlayerStats, savePlayerStats } from './game/storage';
import { saveScoreToRanking } from './game/firebase';
import { sound } from './game/audio';

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(() => loadPlayerStats());
  const [gameMode, setGameMode] = useState<GameMode>('MENU');
  const [, setRenderTrigger] = useState(0);

  // Current session player name
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('fantastic_runner_player_name') || '';
  });

  // Stale-closure immune references
  const engineRef = useRef<GameEngine | null>(null);
  const gameOverHandledRef = useRef<boolean>(false);
  const gameModeRef = useRef<GameMode>(gameMode);
  const playerNameRef = useRef<string>(playerName);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  // Administrative /admin route detection
  const [currentRoute, setCurrentRoute] = useState<'GAME' | 'ADMIN'>(() => {
    if (typeof window === 'undefined') return 'GAME';
    const path = window.location.pathname;
    const hash = window.location.hash;
    const search = new URLSearchParams(window.location.search);
    if (
      path.includes('/admin') ||
      hash.includes('/admin') ||
      hash.includes('#admin') ||
      search.get('page') === 'admin' ||
      search.get('view') === 'admin'
    ) {
      return 'ADMIN';
    }
    return 'GAME';
  });

  // Listen to browser history navigation (/admin vs /)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      if (
        path.includes('/admin') ||
        hash.includes('/admin') ||
        hash.includes('#admin') ||
        search.get('page') === 'admin' ||
        search.get('view') === 'admin'
      ) {
        setCurrentRoute('ADMIN');
      } else {
        setCurrentRoute('GAME');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateToAdmin = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    window.history.pushState(null, '', '/admin');
    setCurrentRoute('ADMIN');
  };

  const navigateToGame = () => {
    window.history.pushState(null, '', '/');
    setCurrentRoute('GAME');
  };

  // Initialize Sound Settings
  useEffect(() => {
    sound.setSettings(stats.settings.soundFx, stats.settings.music, stats.settings.volume);
  }, [stats.settings]);

  // Handle Game Over / Save Progress (Strict Single Execution)
  const handleGameOver = useCallback(() => {
    if (gameOverHandledRef.current) return;
    gameOverHandledRef.current = true;

    if (!engineRef.current) return;
    const eng = engineRef.current;
    eng.stop();

    const finalScore = eng.score;
    const finalDistance = Math.floor(eng.distance);
    const finalKills = eng.killsCount;
    const finalCoins = eng.coinsCollected;

    // Update persistent player stats
    setStats((prevStats) => {
      const updatedStats: PlayerStats = {
        ...prevStats,
        coins: prevStats.coins + finalCoins,
        totalDistance: prevStats.totalDistance + finalDistance,
        totalKills: prevStats.totalKills + finalKills,
        highScore: Math.max(prevStats.highScore, finalScore),
      };
      savePlayerStats(updatedStats);
      return updatedStats;
    });

    // Save official record to Firebase Firestore ranking ONCE
    const activePlayerName = playerNameRef.current.trim() || 'Jugador';
    if (finalScore > 0) {
      saveScoreToRanking({
        playerName: activePlayerName,
        score: finalScore,
        distance: finalDistance,
        kills: finalKills,
        coins: finalCoins,
      }).catch((err) => {
        console.error('Error saving score to Firebase:', err);
      });
    }

    setGameMode('GAMEOVER');
  }, []);

  // UI Force Re-render Callback from Engine
  // Stale-closure immune: directly evaluates engine.isGameOver
  const handleUIUpdate = useCallback(() => {
    setRenderTrigger((prev) => (prev + 1) % 1000);
    if (engineRef.current?.isGameOver) {
      handleGameOver();
    }
  }, [handleGameOver]);

  const handleStartGame = (nameToUse?: string) => {
    gameOverHandledRef.current = false;
    const resolvedName = (nameToUse || playerNameRef.current).trim();
    if (resolvedName) {
      setPlayerName(resolvedName);
      localStorage.setItem('fantastic_runner_player_name', resolvedName);
    }

    if (!engineRef.current) {
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 450;
      dummyCanvas.height = 800;
      engineRef.current = new GameEngine(dummyCanvas, stats, handleUIUpdate);
    } else {
      engineRef.current.reset(stats);
    }

    setGameMode('PLAYING');
    engineRef.current.start();
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setGameMode('PAUSED');
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.start();
    }
    setGameMode('PLAYING');
  };

  const handleRestart = () => {
    gameOverHandledRef.current = false;
    // Show NameInputModal pre-filled with the name to confirm or change
    setGameMode('NAME_INPUT');
  };

  const handleExitToMenu = () => {
    gameOverHandledRef.current = false;
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current.reset(stats);
    }
    setGameMode('MENU');
  };

  const handleUpdateStats = (newStats: PlayerStats) => {
    setStats(newStats);
    savePlayerStats(newStats);
    sound.setSettings(newStats.settings.soundFx, newStats.settings.music, newStats.settings.volume);
  };

  const handleToggleSound = () => {
    const isMuted = !stats.settings.soundFx && !stats.settings.music;
    const newStats: PlayerStats = {
      ...stats,
      settings: {
        ...stats.settings,
        soundFx: isMuted,
        music: isMuted,
      },
    };
    handleUpdateStats(newStats);
  };

  // If visiting /admin, render the full Administrative Dashboard
  if (currentRoute === 'ADMIN') {
    return <AdminDashboard onBackToGame={navigateToGame} />;
  }

  return (
    <ViewportContainer>
      {/* 3D Depth Canvas Layer */}
      {(gameMode === 'PLAYING' || gameMode === 'PAUSED' || gameMode === 'GAMEOVER') && (
        <GameCanvas engine={engineRef.current} />
      )}

      {/* In-Game HUD Layer */}
      {gameMode === 'PLAYING' && engineRef.current && (
        <HUDOverlay engine={engineRef.current} onPause={handlePause} />
      )}

      {/* Main Menu Layer */}
      {gameMode === 'MENU' && (
        <MainMenu
          stats={stats}
          onNavigate={(mode) => setGameMode(mode)}
          onStartGame={() => setGameMode('NAME_INPUT')}
          onToggleSound={handleToggleSound}
          onOpenContact={() => setGameMode('CONTACT')}
          onOpenHowToPlay={() => setGameMode('HOW_TO_PLAY')}
          onOpenAdmin={navigateToAdmin}
        />
      )}

      {/* Pre-Game Name Input Modal */}
      {gameMode === 'NAME_INPUT' && (
        <NameInputModal
          initialName={playerName}
          onConfirm={(confirmedName) => {
            handleStartGame(confirmedName);
          }}
          onCancel={() => setGameMode('MENU')}
        />
      )}

      {/* Menu Modals */}
      {gameMode === 'CONTACT' && (
        <ContactanosModal onClose={() => setGameMode('MENU')} />
      )}

      {gameMode === 'HOW_TO_PLAY' && (
        <ComoJugarModal onClose={() => setGameMode('MENU')} />
      )}

      {gameMode === 'RANKING' && (
        <RankingModal onClose={() => setGameMode('MENU')} />
      )}

      {gameMode === 'SHOP' && (
        <ShopModal
          stats={stats}
          onUpdateStats={handleUpdateStats}
          onClose={() => setGameMode('MENU')}
        />
      )}

      {gameMode === 'CHARACTER' && (
        <CharacterModal
          stats={stats}
          onUpdateStats={handleUpdateStats}
          onClose={() => setGameMode('MENU')}
        />
      )}

      {gameMode === 'POWERUPS' && (
        <PowerupsModal
          stats={stats}
          onUpdateStats={handleUpdateStats}
          onClose={() => setGameMode('MENU')}
        />
      )}

      {gameMode === 'ACHIEVEMENTS' && (
        <AchievementsModal
          stats={stats}
          onUpdateStats={handleUpdateStats}
          onClose={() => setGameMode('MENU')}
        />
      )}

      {gameMode === 'SETTINGS' && (
        <SettingsModal
          stats={stats}
          onUpdateStats={handleUpdateStats}
          onClose={() => setGameMode('MENU')}
        />
      )}

      {gameMode === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onOpenSettings={() => setGameMode('SETTINGS')}
          onExitToMenu={handleExitToMenu}
        />
      )}

      {gameMode === 'GAMEOVER' && engineRef.current && (
        <GameOverModal
          engine={engineRef.current}
          playerName={playerName || 'Jugador'}
          onRestart={handleRestart}
          onExitToMenu={handleExitToMenu}
          onOpenRanking={() => setGameMode('RANKING')}
        />
      )}
    </ViewportContainer>
  );
}
