import React, { useState, useEffect, useRef } from 'react';
import { ViewportContainer } from './components/ViewportContainer';
import { GameCanvas } from './components/GameCanvas';
import { HUDOverlay } from './components/HUDOverlay';
import { MainMenu } from './components/MainMenu';
import { ShopModal } from './components/ShopModal';
import { CharacterModal } from './components/CharacterModal';
import { PowerupsModal } from './components/PowerupsModal';
import { AchievementsModal } from './components/AchievementsModal';
import { RankingModal } from './components/RankingModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { ComoJugarModal } from './components/ComoJugarModal';
import { RecordLocalModal } from './components/RecordLocalModal';
import { ContactanosModal } from './components/ContactanosModal';
import { AdminDashboard } from './components/AdminDashboard';

import { GameEngine } from './game/engine';
import { GameMode, PlayerStats } from './game/types';
import { loadPlayerStats, savePlayerStats, addLeaderboardScore } from './game/storage';
import { sound } from './game/audio';

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(() => loadPlayerStats());
  const [gameMode, setGameMode] = useState<GameMode>('MENU');
  const [, setRenderTrigger] = useState(0);

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

  const engineRef = useRef<GameEngine | null>(null);
  const gameOverHandledRef = useRef<boolean>(false);

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

  // Handle Game Over / Save Progress
  const handleGameOver = () => {
    if (gameOverHandledRef.current) return;
    gameOverHandledRef.current = true;

    if (!engineRef.current) return;
    const eng = engineRef.current;
    eng.stop();

    const newCoins = stats.coins + eng.coinsCollected;
    const newDistance = stats.totalDistance + eng.distance;
    const newKills = stats.totalKills + eng.killsCount;
    const newHighScore = Math.max(stats.highScore, eng.score);

    const updatedStats: PlayerStats = {
      ...stats,
      coins: newCoins,
      totalDistance: newDistance,
      totalKills: newKills,
      highScore: newHighScore,
    };

    setStats(updatedStats);
    savePlayerStats(updatedStats);

    // Add to local backup leaderboard
    addLeaderboardScore({
      playerName: stats.selectedCharacter === 'HERO_LEO' ? 'Leo Runner' : 'Aventurero',
      score: eng.score,
      distance: Math.floor(eng.distance),
      coins: eng.coinsCollected,
    });

    setGameMode('GAMEOVER');
  };

  // UI Force Re-render Callback from Engine
  const handleUIUpdate = () => {
    setRenderTrigger((prev) => (prev + 1) % 1000);
    if (engineRef.current?.isGameOver && gameMode === 'PLAYING') {
      handleGameOver();
    }
  };

  const handleStartGame = () => {
    gameOverHandledRef.current = false;
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
    handleStartGame();
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
          onStartGame={handleStartGame}
          onToggleSound={handleToggleSound}
          onOpenContact={() => setGameMode('CONTACT')}
          onOpenHowToPlay={() => setGameMode('HOW_TO_PLAY')}
          onOpenRecord={() => setGameMode('RECORD_LOCAL')}
          onOpenAdmin={navigateToAdmin}
        />
      )}

      {/* Menu Modals */}
      {gameMode === 'CONTACT' && (
        <ContactanosModal onClose={() => setGameMode('MENU')} />
      )}

      {gameMode === 'HOW_TO_PLAY' && (
        <ComoJugarModal onClose={() => setGameMode('MENU')} />
      )}

      {gameMode === 'RECORD_LOCAL' && (
        <RecordLocalModal
          stats={stats}
          onClose={() => setGameMode('MENU')}
          onOpenOnlineRanking={() => setGameMode('RANKING')}
        />
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
          onRestart={handleRestart}
          onExitToMenu={handleExitToMenu}
          onOpenRanking={() => setGameMode('RANKING')}
        />
      )}
    </ViewportContainer>
  );
}
