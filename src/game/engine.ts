import {
  GameObject,
  PlayerState,
  Projectile,
  Particle,
  ExplosionFX,
  WeaponType,
  PowerUpType,
  PlayerStats,
  EntityType,
} from './types';
import { getSpriteAtlas } from './assets';
import { sound } from './audio';
import tunnelBgUrl from '../assets/images/scifi_tunnel_track_1790828360317.jpg';

// Sliced transparent sprites from user's sprite sheets
import run0 from '../assets/images/runner_run_0.png';
import run1 from '../assets/images/runner_run_1.png';
import run2 from '../assets/images/runner_run_2.png';
import run3 from '../assets/images/runner_run_3.png';
import run4 from '../assets/images/runner_run_4.png';

import shoot0 from '../assets/images/runner_shoot_0.png';
import shoot1 from '../assets/images/runner_shoot_1.png';
import shoot2 from '../assets/images/runner_shoot_2.png';
import shoot3 from '../assets/images/runner_shoot_3.png';
import shoot4 from '../assets/images/runner_shoot_4.png';

// 8 Distinct Enemy Drone Models extracted from reference
import drone0 from '../assets/images/enemy_drone_0.png';
import drone1 from '../assets/images/enemy_drone_1.png';
import drone2 from '../assets/images/enemy_drone_2.png';
import drone3 from '../assets/images/enemy_drone_3.png';
import drone4 from '../assets/images/enemy_drone_4.png';
import drone5 from '../assets/images/enemy_drone_5.png';
import drone6 from '../assets/images/enemy_drone_6.png';
import drone7 from '../assets/images/enemy_drone_7.png';

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private tunnelBgImage: HTMLImageElement;
  private runSprites: HTMLImageElement[] = [];
  private shootSprites: HTMLImageElement[] = [];
  private enemyDroneSprites: HTMLImageElement[] = [];

  // Viewport Dimensions (9:16 Standard Mobile Aspect Ratio)
  public readonly width = 450;
  public readonly height = 800;

  // Camera & Perspective Constants
  public readonly vanishingX = 225;
  public readonly vanishingY = 350; // Descended guide horizon for natural runway perspective
  public readonly focalLength = 360;
  public readonly groundYOffset = 740; // Feet positioned cleanly above bottom margin with full visibility

  // Aiming Reticle / Crosshair (in Canvas Coordinates 450x800)
  public aimX = 225;
  public aimY = 350;

  public setAimPosition(screenX: number, screenY: number) {
    this.aimX = Math.max(10, Math.min(this.width - 10, screenX));
    this.aimY = Math.max(40, Math.min(this.height - 100, screenY));
  }

  public getAimDirection(
    aimScreenX: number,
    aimScreenY: number,
    startX: number,
    startY: number,
    startZ: number,
    targetDepth = 550
  ): { dirX: number; dirY: number; dirZ: number; targetWx: number; targetWy: number; targetWz: number } {
    const scale = this.focalLength / (this.focalLength + Math.max(targetDepth, 1));
    const targetWx = (aimScreenX - this.vanishingX) / scale;
    const targetWy = this.groundYOffset - this.vanishingY - (aimScreenY - this.vanishingY) / scale;
    const targetWz = targetDepth;

    const dx = targetWx - startX;
    const dy = targetWy - startY;
    const dz = targetWz - startZ;

    const len = Math.hypot(dx, dy, dz) || 1;
    return {
      dirX: dx / len,
      dirY: dy / len,
      dirZ: dz / len,
      targetWx,
      targetWy,
      targetWz,
    };
  }

  // World Speed & Progression
  public worldSpeed = 15;
  public distance = 0; // in meters
  public score = 0;
  public coinsCollected = 0;
  public killsCount = 0;
  public isGameOver = false;

  // Player State
  public player: PlayerState;
  public stats: PlayerStats;

  // Game World Entities
  public entities: GameObject[] = [];
  public playerProjectiles: Projectile[] = [];
  public enemyProjectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public explosions: ExplosionFX[] = [];

  // Spawning Timers & Tunnel Grid
  private tunnelZOffset = 0;
  private spawnTimer = 0;
  private bossTimer = 0;
  private nextBossDistance = 1000;
  private lastTime = 0;
  private animFrameReq = 0;

  // Callback to update React UI
  private onUIUpdate?: () => void;

  constructor(canvas: HTMLCanvasElement, stats: PlayerStats, onUIUpdate?: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.stats = stats;
    this.onUIUpdate = onUIUpdate;

    // Load High-Res Sci-Fi Spaceship Tunnel Background
    this.tunnelBgImage = new Image();
    this.tunnelBgImage.src = tunnelBgUrl;

    // Load transparent sliced sprites (Run & Shoot from user's sheets)
    this.runSprites = [run0, run1, run2, run3, run4].map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    this.shootSprites = [shoot0, shoot1, shoot2, shoot3, shoot4].map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    this.enemyDroneSprites = [drone0, drone1, drone2, drone3, drone4, drone5, drone6, drone7].map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    // Initialize Player
    this.player = this.createInitialPlayerState();
  }

  private createInitialPlayerState(): PlayerState {
    return {
      x: 0,
      y: 0,
      z: 0,
      lane: 0,
      targetX: 0,
      vx: 0,
      vy: 0,
      isJumping: false,
      jumpTimer: 0,
      jumpType: 'NONE',
      isDashing: false,
      dashTimer: 0,
      lives: 3,
      maxLives: 3,
      invulnerableTimer: 0,
      animState: 'RUN',
      animFrame: 0,
      shootCooldown: 0,
      activePowerUps: {},
    };
  }

  public reset(stats: PlayerStats) {
    this.stats = stats;
    this.player = this.createInitialPlayerState();
    this.entities = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.particles = [];
    this.explosions = [];
    this.distance = 0;
    this.score = 0;
    this.coinsCollected = 0;
    this.killsCount = 0;
    this.worldSpeed = 15;
    this.isGameOver = false;
    this.nextBossDistance = 1000;
    this.spawnTimer = 0;
    this.aimX = 225;
    this.aimY = 350;
  }

  public start() {
    this.lastTime = performance.now();
    sound.startBGM();
    this.loop(this.lastTime);
  }

  public stop() {
    if (this.animFrameReq) {
      cancelAnimationFrame(this.animFrameReq);
      this.animFrameReq = 0;
    }
    sound.stopBGM();
  }

  private loop = (currentTime: number) => {
    if (this.isGameOver) {
      this.render();
      if (this.onUIUpdate) {
        this.onUIUpdate();
      }
      return;
    }

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    // If update triggered Game Over, perform final render, notify UI and halt loop
    if (this.isGameOver) {
      if (this.onUIUpdate) {
        this.onUIUpdate();
      }
      return;
    }

    // Schedule next frame only if game is still active
    this.animFrameReq = requestAnimationFrame(this.loop);
  };

  /* ========================================================================
     GAME STATE UPDATE LOGIC
     ======================================================================== */

  private update(dt: number) {
    if (this.isGameOver) return;

    // 1. Distance & Difficulty Scaling
    const speedMultiplier = this.player.isDashing ? 2.2 : 1.0;
    const currentSpeed = this.worldSpeed * speedMultiplier;

    this.distance += currentSpeed * dt * 0.8;
    this.score += Math.floor(currentSpeed * dt * 5) * (this.player.activePowerUps.MULTIPLIER ? 2 : 1);
    this.worldSpeed = Math.min(15 + this.distance / 150, 30);

    // Tunnel grid animation: smooth, steady and continuous with modulus matching spacing
    this.tunnelZOffset = (this.tunnelZOffset + currentSpeed * dt * 24) % 100;

    // 2. Player Timers & Power-ups
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }
    if (this.player.shootCooldown > 0) {
      this.player.shootCooldown -= dt;
    }
    if (this.player.isDashing) {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) {
        this.player.isDashing = false;
      }
    }

    // Active Power-ups countdown
    Object.keys(this.player.activePowerUps).forEach((key) => {
      const pKey = key as PowerUpType;
      if (this.player.activePowerUps[pKey]) {
        this.player.activePowerUps[pKey]! -= dt;
        if (this.player.activePowerUps[pKey]! <= 0) {
          delete this.player.activePowerUps[pKey];
        }
      }
    });

    // 3. Player Movement & Physics (6 discrete positions: Left/Center/Right x Ground/Air)
    // Stable exponential decay: guaranteed 0 <= blend <= 1, zero overshooting, zero instability
    const blend = 1 - Math.exp(-22 * dt);
    this.player.x += (this.player.targetX - this.player.x) * blend;
    if (Math.abs(this.player.targetX - this.player.x) < 1.0) {
      this.player.x = this.player.targetX;
    }
    // Hard clamp to prevent any out-of-bounds positioning (6 exact slots)
    this.player.x = Math.max(-80, Math.min(80, this.player.x));

    // Snappy Jump Physics (Crisp 0.38s sine arc reaching apex at 85)
    if (this.player.isJumping) {
      const jumpDuration = 0.38;
      this.player.jumpTimer += dt;
      const progress = Math.min(this.player.jumpTimer / jumpDuration, 1);
      const jumpHeight = this.player.activePowerUps.SUPER_JUMP ? 105 : 85;
      this.player.y = Math.sin(progress * Math.PI) * jumpHeight;

      if (progress >= 1) {
        this.player.y = 0;
        this.player.isJumping = false;
        this.player.jumpTimer = 0;
        this.player.jumpType = 'NONE';
        this.player.animState = 'RUN';
      }
    } else {
      this.player.y = 0;
    }

    // Animation frame index: accelerated & fluid run cycle (24 fps)
    this.player.animFrame += dt * 24;

    // Reset shoot animation back to RUN when weapon cooldown completes
    if (this.player.animState === 'SHOOT' && this.player.shootCooldown <= 0) {
      this.player.animState = 'RUN';
    }

    // 4. Entity Spawner
    this.spawnTimer += dt * currentSpeed;
    if (this.spawnTimer > 18) {
      this.spawnTimer = 0;
      this.spawnRandomEntities();
    }

    // Boss Spawn Check
    if (this.distance >= this.nextBossDistance) {
      this.spawnBoss();
      this.nextBossDistance += 1200;
    }

    // 5. Update Game Entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      ent.z -= (ent.speedZ + currentSpeed) * dt * 40;

      // Enemy horizontal movement
      if (ent.vx) ent.x += ent.vx * dt * 20;

      // Magnet Power-up logic for coins & gems
      if (this.player.activePowerUps.MAGNET && (ent.type === 'COIN' || ent.type === 'GEM_BLUE' || ent.type === 'GEM_RED')) {
        const dx = this.player.x - ent.x;
        const dy = this.player.y - ent.y;
        if (ent.z < 350) {
          ent.x += dx * 6 * dt;
          ent.y += dy * 6 * dt;
        }
      }

      // Remove entities behind camera
      if (ent.z < -20 || !ent.active) {
        this.entities.splice(i, 1);
        continue;
      }

      // Enemy shooting down at player from upper tunnel
      if (
        (ent.type === 'DRONE_RED' || ent.type === 'DRONE_BLUE' || ent.type === 'BOSS_SHIP') &&
        ent.z < 850 &&
        ent.z > 150
      ) {
        if (Math.random() < dt * 1.5) {
          this.enemyShoot(ent);
        }
      }

      // Check Player Collision
      this.checkPlayerEntityCollision(ent);
    }

    // 6. Update Player Projectiles
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const p = this.playerProjectiles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.z += p.vz * dt * 60;

      if (p.z > 1100 || !p.active) {
        this.playerProjectiles.splice(i, 1);
        continue;
      }

      // Check Projectile <-> Entity Collisions
      for (const ent of this.entities) {
        if (!ent.active || ent.z < 20) continue;
        if (
          ent.type === 'COIN' ||
          ent.type === 'GEM_BLUE' ||
          ent.type === 'GEM_RED' ||
          ent.type === 'POWERUP_ORB' ||
          ent.type === 'HEART'
        ) {
          continue;
        }

        const dz = Math.abs(p.z - ent.z);
        const dx = Math.abs(p.x - ent.x);
        const dy = Math.abs(p.y - ent.y);

        // Generous Z-interval window to prevent fast bullets/entities from leapfrogging each other
        const hitZ = dz < Math.max(70, (p.vz + 30) * dt * 60);
        const hitX = dx < ent.radius + p.radius + 20;
        const hitY = dy < ent.radius + p.radius + 35;

        if (hitZ && hitX && hitY) {
          ent.hp -= p.damage;
          p.active = false;

          // Impact sparks & rock rubble particles
          if (ent.type === 'ROCK') {
            sound.playExplosion(false);
            for (let k = 0; k < 8; k++) {
              this.particles.push({
                x: ent.x + (Math.random() - 0.5) * 30,
                y: ent.y + (Math.random() - 0.5) * 30,
                z: ent.z,
                vx: (Math.random() - 0.5) * 16,
                vy: Math.random() * 14 + 4,
                vz: (Math.random() - 0.5) * 10,
                color: Math.random() < 0.5 ? '#ff5500' : '#475569',
                size: Math.random() * 5 + 3,
                alpha: 1,
                life: 0,
                maxLife: 0.6,
              });
            }
          } else {
            this.addExplosion(ent.x, ent.y, ent.z, 'IMPACT');
          }

          if (ent.hp <= 0) {
            ent.active = false;
            this.killsCount++;
            this.score += ent.points;
            sound.playExplosion(ent.type === 'BOSS_SHIP' || ent.type === 'ROCK');
            this.addExplosion(ent.x, ent.y, ent.z, ent.radius > 35 ? 'LARGE' : 'SMALL');

            // Volcanic rock fracture particles upon destruction
            if (ent.type === 'ROCK') {
              for (let k = 0; k < 18; k++) {
                this.particles.push({
                  x: ent.x + (Math.random() - 0.5) * 50,
                  y: ent.y + Math.random() * 30,
                  z: ent.z + (Math.random() - 0.5) * 30,
                  vx: (Math.random() - 0.5) * 24,
                  vy: Math.random() * 20 + 6,
                  vz: (Math.random() - 0.5) * 18,
                  color: ['#ff3700', '#ffea00', '#334155', '#64748b'][k % 4],
                  size: Math.random() * 8 + 4,
                  alpha: 1,
                  life: 0,
                  maxLife: 0.8,
                });
              }
            }

            // Chance to drop coins or gems upon destruction
            if (Math.random() < 0.65) {
              this.spawnLootAt(ent.x, ent.y, ent.z);
            }
          }
          break;
        }
      }
    }

    // 7. Update Enemy Projectiles (aiming down from ceiling towards player)
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.x += (ep.vx || 0) * dt * 60;
      ep.y += (ep.vy || 0) * dt * 60;
      ep.z -= ep.vz * dt * 60;

      if (ep.z < -20 || !ep.active) {
        this.enemyProjectiles.splice(i, 1);
        continue;
      }

      // Check hit on player
      if (ep.z < 35 && ep.z > -15) {
        const dx = Math.abs(ep.x - this.player.x);
        const dy = Math.abs(ep.y - (this.player.y + 35));
        if (dx < 30 && dy < 45) {
          ep.active = false;
          this.damagePlayer('ENEMY_SHOT');
          this.addExplosion(this.player.x, this.player.y + 35, 10, 'IMPACT');
          if (this.isGameOver) break;
        }
      }
    }

    // 8. Update Particles & Explosions
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life += dt;
      part.x += part.vx * dt * 60;
      part.y += part.vy * dt * 60;
      part.z += part.vz * dt * 60;
      part.alpha = 1 - part.life / part.maxLife;

      if (part.life >= part.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.frameTime += dt * 15;
      exp.frame = Math.floor(exp.frameTime);
      if (exp.frame >= exp.maxFrame) {
        this.explosions.splice(i, 1);
      }
    }

    if (!this.isGameOver && this.onUIUpdate) {
      this.onUIUpdate();
    }
  }

  /* ========================================================================
     CONTROLS & ACTION COMMANDS
     ======================================================================== */

  public moveLeft() {
    if (this.player.lane > -1) {
      this.player.lane -= 1;
      this.player.targetX = this.player.lane * 80;
    }
  }

  public moveRight() {
    if (this.player.lane < 1) {
      this.player.lane += 1;
      this.player.targetX = this.player.lane * 80;
    }
  }

  public jump(dir?: 'LEFT' | 'RIGHT') {
    if (!this.player.isJumping) {
      this.player.isJumping = true;
      this.player.jumpTimer = 0;
      sound.playJump();

      if (dir === 'LEFT') {
        this.moveLeft();
        this.player.jumpType = 'LEFT';
      } else if (dir === 'RIGHT') {
        this.moveRight();
        this.player.jumpType = 'RIGHT';
      } else {
        this.player.jumpType = 'VERTICAL';
      }
    }
  }

  public dash() {
    if (!this.player.isDashing) {
      this.player.isDashing = true;
      this.player.dashTimer = 1.8;
      sound.playPowerUp();

      // Create dash speed particles
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: this.player.x + (Math.random() * 80 - 40),
          y: this.player.y + Math.random() * 40,
          z: Math.random() * 100,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          vz: -30,
          size: 3 + Math.random() * 4,
          color: '#00f0ff',
          alpha: 1,
          life: 0,
          maxLife: 0.5,
          type: 'SPEED_LINE',
        });
      }
    }
  }

  public shoot() {
    if (this.player.shootCooldown > 0) return;

    const weapon = this.stats.equippedWeapon;
    const isMultiShot = Boolean(this.player.activePowerUps.MULTI_SHOT);

    sound.playShoot(weapon);
    this.player.shootCooldown = weapon === 'BEAM' ? 0.35 : weapon === 'PLASMA' ? 0.4 : 0.15;
    this.player.animState = 'SHOOT';

    const handX = this.player.x + 28;
    const handY = this.player.y + 38;
    const handZ = 15;

    // Calculate aim direction strictly towards the crosshair in 3D tunnel space
    const aimDir = this.getAimDirection(this.aimX, this.aimY, handX, handY, handZ, 550);

    // Muzzle flash particle burst at the weapon towards aim direction
    for (let m = 0; m < 6; m++) {
      this.particles.push({
        x: handX + (Math.random() - 0.5) * 8,
        y: handY + (Math.random() - 0.5) * 8,
        z: handZ,
        vx: aimDir.dirX * 16 + (Math.random() - 0.5) * 6,
        vy: aimDir.dirY * 16 + (Math.random() - 0.5) * 6,
        vz: aimDir.dirZ * 16 + Math.random() * 8,
        color: Math.random() < 0.5 ? '#ffffff' : '#facc15',
        size: Math.random() * 4 + 2,
        alpha: 1,
        life: 0,
        maxLife: 0.25,
      });
    }

    if (isMultiShot || weapon === 'SPREAD') {
      // 3-way spread around the aim point
      const speed = 40;
      [-40, 0, 40].forEach((offsetScreenX) => {
        const spreadAim = this.getAimDirection(this.aimX + offsetScreenX, this.aimY, handX, handY, handZ, 550);
        this.playerProjectiles.push({
          id: Math.random().toString(),
          isPlayer: true,
          x: handX,
          y: handY,
          z: handZ,
          vx: spreadAim.dirX * speed,
          vy: spreadAim.dirY * speed,
          vz: spreadAim.dirZ * speed,
          radius: 17,
          damage: 15,
          type: 'SPREAD',
          color: '#fbbf24',
          active: true,
        });
      });
    } else if (weapon === 'BEAM') {
      const speed = 56;
      this.playerProjectiles.push({
        id: Math.random().toString(),
        isPlayer: true,
        x: handX,
        y: handY,
        z: handZ,
        vx: aimDir.dirX * speed,
        vy: aimDir.dirY * speed,
        vz: aimDir.dirZ * speed,
        radius: 20,
        damage: 40,
        type: 'BEAM',
        color: '#fef08a',
        active: true,
      });
    } else if (weapon === 'PLASMA') {
      const speed = 34;
      this.playerProjectiles.push({
        id: Math.random().toString(),
        isPlayer: true,
        x: handX,
        y: handY,
        z: handZ,
        vx: aimDir.dirX * speed,
        vy: aimDir.dirY * speed,
        vz: aimDir.dirZ * speed,
        radius: 26,
        damage: 60,
        type: 'PLASMA',
        color: '#fb923c',
        active: true,
      });
    } else {
      // BASIC
      const speed = 42;
      this.playerProjectiles.push({
        id: Math.random().toString(),
        isPlayer: true,
        x: handX,
        y: handY,
        z: handZ,
        vx: aimDir.dirX * speed,
        vy: aimDir.dirY * speed,
        vz: aimDir.dirZ * speed,
        radius: 17,
        damage: 20,
        type: 'BASIC',
        color: '#facc15',
        active: true,
      });
    }
  }

  /* ========================================================================
     COLLISION & COMBAT HELPER METHODS
     ======================================================================== */

  private checkPlayerEntityCollision(ent: GameObject) {
    if (this.isGameOver) return;
    if (!ent.active) return;

    // Depth check: Player is near Z=0 (10 to -20)
    if (ent.z > 35 || ent.z < -10) return;

    const dx = Math.abs(ent.x - this.player.x);
    const dy = Math.abs(ent.y - this.player.y);

    // Collision threshold based on entity
    const thresholdX = ent.radius + 15;
    const thresholdY = ent.radius + 20;

    if (dx < thresholdX && dy < thresholdY) {
      // 1. Collectible Loot
      if (ent.type === 'COIN') {
        ent.active = false;
        this.coinsCollected += 1;
        this.score += 50;
        sound.playCoin();
        this.addExplosion(ent.x, ent.y, ent.z, 'COIN');
        return;
      }
      if (ent.type === 'GEM_BLUE') {
        ent.active = false;
        this.coinsCollected += 5;
        this.score += 250;
        sound.playCoin();
        this.addExplosion(ent.x, ent.y, ent.z, 'COIN');
        return;
      }
      if (ent.type === 'GEM_RED') {
        ent.active = false;
        this.coinsCollected += 10;
        this.score += 500;
        sound.playCoin();
        this.addExplosion(ent.x, ent.y, ent.z, 'COIN');
        return;
      }
      if (ent.type === 'HEART') {
        ent.active = false;
        this.player.lives = Math.min(this.player.lives + 1, this.player.maxLives);
        sound.playPowerUp();
        return;
      }
      if (ent.type === 'POWERUP_ORB' && ent.powerUpKind) {
        ent.active = false;
        this.player.activePowerUps[ent.powerUpKind] = 8.0; // 8 seconds duration
        sound.playPowerUp();
        return;
      }

      // 2. Dash destroys obstacles without player damage
      if (this.player.isDashing) {
        ent.active = false;
        this.score += ent.points;
        sound.playExplosion(true);
        this.addExplosion(ent.x, ent.y, ent.z, 'LARGE');
        return;
      }

      // 3. Jump Over Low Obstacles (Rocks, Crates, Low Lasers, Mines)
      if (
        (ent.type === 'ROCK' && this.player.y > 35) ||
        (ent.type === 'CRATE' && this.player.y > 30) ||
        (ent.type === 'LASER_BARRIER_LOW' && this.player.y > 30) ||
        (ent.type === 'SPIKED_MINE' && this.player.y > 35)
      ) {
        // Player safely cleared obstacle by jumping!
        return;
      }

      // 4. Harmful Obstacles / Enemies
      this.damagePlayer('OBSTACLE');
      ent.active = false;
      this.addExplosion(ent.x, ent.y, ent.z, 'LARGE');
    }
  }

  private damagePlayer(_source: string) {
    if (this.isGameOver) return;
    if (this.player.invulnerableTimer > 0) return;

    // Shield powerup absorbs hit
    if (this.player.activePowerUps.SHIELD) {
      delete this.player.activePowerUps.SHIELD;
      this.player.invulnerableTimer = 1.0;
      sound.playPowerUp();
      return;
    }

    this.player.lives -= 1;

    if (this.player.lives <= 0) {
      this.player.lives = 0;
      this.isGameOver = true;
      this.player.animState = 'DEATH';
      sound.playExplosion(true);
      sound.stopBGM();
      if (this.onUIUpdate) {
        this.onUIUpdate();
      }
      return;
    }

    this.player.invulnerableTimer = 1.8;
    this.player.animState = 'DAMAGE';
    sound.playDamage();
  }

  private spawnRandomEntities() {
    const lanes = [-80, 0, 80];
    const laneIndex = Math.floor(Math.random() * 3);
    const spawnX = lanes[laneIndex];

    const rnd = Math.random();

    if (rnd < 0.28) {
      // 3D Volcanic Magma Rock / Asteroid (1-2 shots destroy it)
      this.entities.push({
        id: Math.random().toString(),
        type: 'ROCK',
        x: spawnX,
        y: 0,
        z: 1000,
        speedZ: 0,
        radius: 70,
        width: 165,
        height: 165,
        hp: 20, // 1 direct blaster shot destroys it
        maxHp: 20,
        points: 100,
        active: true,
      });
    } else if (rnd < 0.58) {
      // Aerial Enemy Flying Drone (flying prominently at player head height and shooting at player)
      const isMine = Math.random() < 0.2;
      if (isMine) {
        this.entities.push({
          id: Math.random().toString(),
          type: 'SPIKED_MINE',
          x: spawnX,
          y: 40,
          z: 1000,
          speedZ: 1,
          radius: 45,
          width: 102,
          height: 102,
          hp: 25,
          maxHp: 25,
          points: 150,
          active: true,
        });
      } else {
        const isRed = Math.random() < 0.5;
        this.entities.push({
          id: Math.random().toString(),
          type: isRed ? 'DRONE_RED' : 'DRONE_BLUE',
          x: spawnX,
          y: 190, // Exactly at player head height!
          z: 1000,
          speedZ: 3.5, // Flying in towards player
          vx: 0,
          radius: 72,
          width: 215, // Large, imposing enemy combat ship (+18%)
          height: 180,
          hp: 20, // Destroyable with 1-2 shots
          maxHp: 20,
          points: 200,
          active: true,
        });
      }
    } else if (rnd < 0.72) {
      // Laser Barrier or Crate
      const isCrate = Math.random() < 0.4;
      if (isCrate) {
        this.entities.push({
          id: Math.random().toString(),
          type: 'CRATE',
          x: spawnX,
          y: 0,
          z: 1000,
          speedZ: 0,
          radius: 42,
          width: 95,
          height: 95,
          hp: 20,
          maxHp: 20,
          points: 75,
          active: true,
        });
      } else {
        this.entities.push({
          id: Math.random().toString(),
          type: 'LASER_BARRIER_LOW',
          x: 0,
          y: 20,
          z: 1000,
          speedZ: 0,
          radius: 50,
          width: 280,
          height: 50,
          hp: 999, // indestructible barrier
          maxHp: 999,
          points: 0,
          active: true,
        });
      }
    } else if (rnd < 0.85) {
      // Coins line pattern
      for (let c = 0; c < 4; c++) {
        this.entities.push({
          id: Math.random().toString(),
          type: 'COIN',
          x: spawnX,
          y: 25,
          z: 1000 + c * 80,
          speedZ: 0,
          radius: 30,
          width: 70,
          height: 70,
          hp: 1,
          maxHp: 1,
          points: 50,
          active: true,
        });
      }
    } else {
      // Power-up Orb
      const pKinds: PowerUpType[] = ['SHIELD', 'SUPER_JUMP', 'MULTI_SHOT', 'MAGNET', 'MULTIPLIER', 'DASH'];
      const k = pKinds[Math.floor(Math.random() * pKinds.length)];
      this.entities.push({
        id: Math.random().toString(),
        type: 'POWERUP_ORB',
        x: spawnX,
        y: 40,
        z: 1000,
        speedZ: 0,
        radius: 26,
        width: 54,
        height: 54,
        hp: 1,
        maxHp: 1,
        powerUpKind: k,
        points: 150,
        active: true,
      });
    }
  }

  private spawnBoss() {
    this.entities.push({
      id: 'BOSS_' + Date.now(),
      type: 'BOSS_SHIP',
      x: 0,
      y: 60,
      z: 1000,
      speedZ: -4, // stays near horizon and fires
      radius: 78,
      width: 168,
      height: 120,
      hp: 350,
      maxHp: 350,
      points: 2500,
      active: true,
    });
  }

  private enemyShoot(enemy: GameObject) {
    sound.playShoot('BASIC');

    // Calculate 3D aiming vector towards player chest
    const distZ = Math.max(enemy.z - this.player.z, 60);
    const vz = 32;
    const timeToPlayer = distZ / (vz * 60);

    const targetX = this.player.x;
    const targetY = this.player.y + 35; // Aim at player chest/body

    const vx = (targetX - enemy.x) / (timeToPlayer * 60);
    const vy = (targetY - enemy.y) / (timeToPlayer * 60);

    this.enemyProjectiles.push({
      id: Math.random().toString(),
      isPlayer: false,
      x: enemy.x,
      y: enemy.y,
      z: enemy.z - 10,
      vx,
      vy,
      vz,
      radius: 13,
      damage: 1,
      type: 'ENEMY_BULLET',
      color: '#ff0055',
      active: true,
    });
  }

  private spawnLootAt(x: number, y: number, z: number) {
    const isGem = Math.random() < 0.3;
    this.entities.push({
      id: Math.random().toString(),
      type: isGem ? 'GEM_BLUE' : 'COIN',
      x,
      y,
      z,
      speedZ: 0,
      radius: 16,
      width: 32,
      height: 32,
      hp: 1,
      maxHp: 1,
      points: isGem ? 250 : 50,
      active: true,
    });
  }

  private addExplosion(x: number, y: number, z: number, type: 'SMALL' | 'LARGE' | 'IMPACT' | 'COIN') {
    this.explosions.push({
      x,
      y,
      z,
      scale: type === 'LARGE' ? 1.5 : 0.8,
      type,
      frame: 0,
      maxFrame: 8,
      frameTime: 0,
    });
  }

  /* ========================================================================
     CANVAS PSEUDO-3D RENDERING SYSTEM
     ======================================================================== */

  private render() {
    const { ctx, width, height, vanishingX, vanishingY } = this;
    const atlas = getSpriteAtlas();

    // 1. Draw Background (Direct high-res background or procedural fallback)
    const hasBg =
      this.tunnelBgImage &&
      this.tunnelBgImage.complete &&
      this.tunnelBgImage.naturalWidth > 0;

    if (hasBg) {
      this.safeDrawImage(this.tunnelBgImage, 0, 0, width, height);
    } else {
      const spaceGrad = ctx.createLinearGradient(0, 0, 0, height);
      spaceGrad.addColorStop(0, '#030712');
      spaceGrad.addColorStop(0.35, '#0f172a');
      spaceGrad.addColorStop(0.5, '#1e1b4b');
      spaceGrad.addColorStop(1, '#020617');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, width, height);
      this.renderSpaceBackground();
    }

    // 2. Sci-Fi Tunnel Floor Grid & Guide Lines
    this.renderTunnelGrid();

    // 3. Collect all renderable 3D entities for Depth Sorting (Far to Near)
    const renderList: Array<{
      z: number;
      draw: () => void;
    }> = [];

    // Projectile objects
    this.playerProjectiles.forEach((p) => {
      renderList.push({
        z: p.z,
        draw: () => this.drawProjectile(p, atlas),
      });
    });

    this.enemyProjectiles.forEach((ep) => {
      renderList.push({
        z: ep.z,
        draw: () => this.drawProjectile(ep, atlas),
      });
    });

    // World Entities (Rocks, Drones, Lasers, Coins)
    this.entities.forEach((ent) => {
      renderList.push({
        z: ent.z,
        draw: () => this.drawEntity(ent, atlas),
      });
    });

    // Explosions FX
    this.explosions.forEach((exp) => {
      renderList.push({
        z: exp.z,
        draw: () => this.drawExplosion(exp, atlas),
      });
    });

    // Player (Always rendered at Z=0)
    renderList.push({
      z: this.player.z,
      draw: () => this.drawPlayer(atlas),
    });

    // Sort by Z descending (Distant Z=1000 rendered first, Close Z=0 rendered last)
    renderList.sort((a, b) => b.z - a.z);

    // Execute Depth Render
    renderList.forEach((item) => item.draw());

    // 4. Foreground Particles & Dash FX
    this.renderParticles();

    // Invulnerability Damage Flash Overlay
    if (this.player.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 0, width, height);
    }

    // 5. Draw Aiming Crosshair / Reticle (The player's aiming point)
    if (!this.isGameOver) {
      this.renderCrosshair();
    }
  }

  private project(
    wx: number,
    wy: number,
    wz: number
  ): { x: number; y: number; scale: number } {
    const scale = this.focalLength / (this.focalLength + Math.max(wz, 1));
    const x = this.vanishingX + wx * scale;
    const y = this.vanishingY + (this.groundYOffset - wy - this.vanishingY) * scale;
    return { x, y, scale };
  }

  private renderSpaceBackground() {
    const { ctx, width, vanishingY } = this;

    // Glowing Nebula Star at Horizon
    const glow = ctx.createRadialGradient(
      this.vanishingX,
      vanishingY,
      10,
      this.vanishingX,
      vanishingY,
      220
    );
    glow.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
    glow.addColorStop(0.5, 'rgba(147, 51, 234, 0.2)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, vanishingY + 80);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 35; i++) {
      const sx = (i * 137) % width;
      const sy = (i * 83) % (vanishingY - 20);
      const sz = ((i * 5) % 3) + 1;
      ctx.fillRect(sx, sy, sz, sz);
    }
  }

  private safeDrawImage(
    img: CanvasImageSource | null | undefined,
    dx: number,
    dy: number,
    dw?: number,
    dh?: number
  ) {
    if (!img) return;
    if (
      !(img instanceof HTMLCanvasElement) &&
      !(img instanceof HTMLImageElement) &&
      !(img instanceof ImageBitmap) &&
      !(typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas)
    ) {
      return;
    }
    try {
      if (dw !== undefined && dh !== undefined) {
        this.ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        this.ctx.drawImage(img, dx, dy);
      }
    } catch {
      // Safe fallback
    }
  }

  private renderTunnelGrid() {
    const { ctx, vanishingY, width } = this;

    // Animated Runway Floor Panels & Moving Speed Chevrons
    // Perfectly matched 100-unit spacing with modulo 100 for seamless, jitter-free motion
    const gridSpacing = 100;
    for (let z = 1000; z >= 0; z -= gridSpacing) {
      const actualZ = z - this.tunnelZOffset;
      if (actualZ <= 0) continue;

      const pCenter = this.project(0, 0, actualZ);
      const pLeft = this.project(-70, 0, actualZ);
      const pRight = this.project(70, 0, actualZ);

      // Central forward chevron speed arrow (^)
      const s = Math.max(1, 14 * (1 - actualZ / 1000));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = Math.max(1, 2.5 * (1 - actualZ / 1000));
      ctx.beginPath();
      ctx.moveTo(pCenter.x - s, pCenter.y + s * 0.6);
      ctx.lineTo(pCenter.x, pCenter.y - s * 0.4);
      ctx.lineTo(pCenter.x + s, pCenter.y + s * 0.6);
      ctx.stroke();

      // Glowing Amber Floor Light Rectangles
      const rw = Math.max(2, 32 * (1 - actualZ / 1000));
      const rh = Math.max(1, 9 * (1 - actualZ / 1000));
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(pCenter.x - rw / 2, pCenter.y + s, rw, rh);

      // Side Amber Light Strips
      const sw = Math.max(2, 22 * (1 - actualZ / 1000));
      const sh = Math.max(1, 7 * (1 - actualZ / 1000));
      ctx.fillRect(pLeft.x - sw / 2, pLeft.y, sw, sh);
      ctx.fillRect(pRight.x - sw / 2, pRight.y, sw, sh);
    }

    // Lane divider guide lines (Guías de los 3 carriles: -80, 0, 80)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    [-40, 40].forEach((wx) => {
      const pFar = this.project(wx, 0, 1000);
      const pNear = this.project(wx, 0, -20);
      ctx.beginPath();
      ctx.moveTo(pFar.x, pFar.y);
      ctx.lineTo(pNear.x, pNear.y);
      ctx.stroke();
    });

    // Outer runway track boundary rails
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1.5;
    [-120, 120].forEach((wx) => {
      const pFar = this.project(wx, 0, 1000);
      const pNear = this.project(wx, 0, -20);
      ctx.beginPath();
      ctx.moveTo(pFar.x, pFar.y);
      ctx.lineTo(pNear.x, pNear.y);
      ctx.stroke();
    });

    // Gentle Horizon Line Glow
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, vanishingY);
    ctx.lineTo(width, vanishingY);
    ctx.stroke();
  }

  private drawPlayer(atlas: ReturnType<typeof getSpriteAtlas>) {
    const { ctx } = this;
    const { x, y, z, isDashing, activePowerUps, animFrame, animState, shootCooldown } = this.player;

    const p = this.project(x, y, z);

    ctx.save();
    ctx.translate(p.x, p.y);

    // 0. Floor contact shadow (Always anchors player clearly to current lane)
    const shadowScale = Math.max(0.4, 1 - (y / 100) * 0.5);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 48 * shadowScale, 14 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Dash Energy Aura (Cyan)
    if (isDashing) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, -100, 85, 110, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Select Sprite: EXCLUSIVELY the user's sliced 512x512 sprites (Run vs Run & Shoot)
    const isShooting = animState === 'SHOOT' || shootCooldown > 0;
    const spriteList = isShooting ? this.shootSprites : this.runSprites;
    const numFrames = spriteList.length || 1;
    const frameIndex = Math.abs(Math.floor(animFrame || 0)) % numFrames;

    const sprite = spriteList[frameIndex];

    // Strictly maintain 1:1 aspect ratio of the 512x512 official sprite frames
    const renderSize = 210;
    let drawn = false;
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      this.safeDrawImage(sprite, -renderSize / 2, -renderSize, renderSize, renderSize);
      drawn = true;
    }
    // High-fidelity fallback if sprite is loading
    if (!drawn && atlas.playerFront) {
      this.safeDrawImage(atlas.playerFront, -renderSize / 2, -renderSize, renderSize, renderSize);
      drawn = true;
    }

    // 3. Shield Active Bubble (Green Hexagonal Shield matching reference)
    if (activePowerUps.SHIELD && atlas.playerShield) {
      this.safeDrawImage(atlas.playerShield, -115, -230, 230, 230);
    }

    ctx.restore();
  }

  private drawEntity(ent: GameObject, atlas: ReturnType<typeof getSpriteAtlas>) {
    const { ctx } = this;
    const p = this.project(ent.x, ent.y, ent.z);

    if (p.x < -100 || p.x > this.width + 100 || p.y < -100 || p.y > this.height + 100) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale);

    let sprite: HTMLCanvasElement | HTMLImageElement | null = null;
    const now = Date.now();

    if (ent.type === 'ROCK' && atlas.rock?.length) {
      sprite = atlas.rock[Math.floor(now / 200) % atlas.rock.length];
    } else if (ent.type === 'DRONE_RED' || ent.type === 'DRONE_BLUE') {
      if (this.enemyDroneSprites.length > 0) {
        let hash = 0;
        const idStr = String(ent.id || '0');
        for (let i = 0; i < idStr.length; i++) {
          hash = (hash << 5) - hash + idStr.charCodeAt(i);
          hash |= 0;
        }
        const droneIdx = Math.abs(hash) % this.enemyDroneSprites.length;
        const candidate = this.enemyDroneSprites[droneIdx];
        if (candidate && candidate.complete && candidate.naturalWidth > 0) {
          sprite = candidate;
        } else {
          sprite = ent.type === 'DRONE_RED' ? atlas.droneRed[0] : atlas.droneBlue[0];
        }
      } else {
        sprite = ent.type === 'DRONE_RED' ? atlas.droneRed[0] : atlas.droneBlue[0];
      }
    } else if (ent.type === 'BOSS_SHIP') {
      sprite = atlas.bossShip;
    } else if (ent.type === 'SPIKED_MINE') {
      sprite = atlas.spikedMine;
    } else if (ent.type === 'ROTATING_BLADE') {
      sprite = atlas.rotatingBlade;
    } else if (ent.type === 'CRATE') {
      sprite = atlas.crate;
    } else if (ent.type === 'COIN' && atlas.coin?.length) {
      sprite = atlas.coin[Math.floor(now / 120) % atlas.coin.length];
    } else if (ent.type === 'GEM_BLUE') {
      sprite = atlas.gemBlue;
    } else if (ent.type === 'GEM_RED') {
      sprite = atlas.gemRed;
    } else if (ent.type === 'POWERUP_ORB') {
      if (ent.powerUpKind === 'SHIELD') sprite = atlas.powerUpShield;
      else if (ent.powerUpKind === 'SUPER_JUMP') sprite = atlas.powerUpJump;
      else if (ent.powerUpKind === 'MULTI_SHOT') sprite = atlas.powerUpSpread;
      else if (ent.powerUpKind === 'MAGNET') sprite = atlas.powerUpMagnet;
      else if (ent.powerUpKind === 'MULTIPLIER') sprite = atlas.powerUpMultiplier;
      else sprite = atlas.powerUpDash;
    } else if (ent.type === 'LASER_BARRIER_LOW') {
      // Draw Laser Pillars & Gate Beam
      this.safeDrawImage(atlas.laserPillar, -110, -50);
      this.safeDrawImage(atlas.laserPillar, 70, -50);
      this.safeDrawImage(atlas.laserBeam, -60, -30);
    }

    if (sprite) {
      if (ent.type === 'DRONE_RED' || ent.type === 'DRONE_BLUE') {
        const droneW = Math.max(ent.width, 180);
        const droneH = Math.max(ent.height, 150);
        this.safeDrawImage(sprite, -droneW / 2, -droneH / 2, droneW, droneH);
      } else {
        this.safeDrawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height);
      }
    }

    // High-performance lighting and attack effects for enemy drones
    if (ent.type === 'DRONE_RED' || ent.type === 'DRONE_BLUE') {
      const isRed = ent.type === 'DRONE_RED';
      const pulse = Math.sin(now / 130) * 0.35 + 0.65;
      const attackCharge = Math.sin(now / 180);

      // 1. Thruster exhaust flame (Layered alpha glow, 60fps fast)
      ctx.fillStyle = isRed ? 'rgba(255, 60, 60, 0.35)' : 'rgba(0, 200, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, ent.height / 2 - 2, 18 * pulse, 32 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isRed ? 'rgba(255, 140, 140, 0.95)' : 'rgba(140, 230, 255, 0.95)';
      ctx.beginPath();
      ctx.ellipse(0, ent.height / 2 - 2, 8 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Core / Eye glowing energy light
      ctx.fillStyle = isRed ? 'rgba(255, 0, 85, 0.35)' : 'rgba(0, 240, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(0, -6, 22 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isRed ? '#ff0055' : '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, -6, 12 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // 3. Attack laser charge reticle
      if (attackCharge > 0.3) {
        ctx.strokeStyle = isRed ? 'rgba(255, 60, 60, 0.85)' : 'rgba(0, 240, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, ent.width * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Boss HP bar
    if (ent.type === 'BOSS_SHIP' && ent.hp < ent.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-60, -80, 120, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-58, -78, 116 * (ent.hp / ent.maxHp), 6);
    }

    ctx.restore();
  }

  private renderCrosshair() {
    const { ctx, aimX, aimY } = this;
    ctx.save();

    // 1. Soft glowing aura around reticle
    const glowGrad = ctx.createRadialGradient(aimX, aimY, 2, aimX, aimY, 22);
    glowGrad.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
    glowGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.2)');
    glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(aimX, aimY, 22, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-contrast outer ring: dark border with bright amber/gold line
    ctx.strokeStyle = '#050814';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(aimX, aimY, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(aimX, aimY, 14, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Four cardinal tick marks with dark outline & bright core
    const ticks = [
      { x1: aimX, y1: aimY - 18, x2: aimX, y2: aimY - 6 },
      { x1: aimX, y1: aimY + 6, x2: aimX, y2: aimY + 18 },
      { x1: aimX - 18, y1: aimY, x2: aimX - 6, y2: aimY },
      { x1: aimX + 6, y1: aimY, x2: aimX + 18, y2: aimY },
    ];

    // Dark outline under-layer
    ctx.strokeStyle = '#050814';
    ctx.lineWidth = 3.5;
    ticks.forEach(({ x1, y1, x2, y2 }) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Bright white/yellow core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ticks.forEach(({ x1, y1, x2, y2 }) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // 4. Center Aiming Dot (White with dark outline)
    ctx.fillStyle = '#050814';
    ctx.beginPath();
    ctx.arc(aimX, aimY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(aimX, aimY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawProjectile(p: Projectile, atlas: ReturnType<typeof getSpriteAtlas>) {
    const { ctx } = this;
    const pt = this.project(p.x, p.y, p.z);

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.scale(pt.scale, pt.scale);

    if (p.isPlayer) {
      const rad = p.radius || 17;

      // 1. High-contrast weapon colors
      let glowColor = 'rgba(245, 158, 11, 0.55)'; // amber-gold
      let bodyColor = '#facc15'; // bright yellow-gold

      if (p.type === 'BEAM') {
        glowColor = 'rgba(251, 191, 36, 0.7)';
        bodyColor = '#fef08a';
      } else if (p.type === 'PLASMA') {
        glowColor = 'rgba(234, 88, 12, 0.65)'; // blazing neon orange
        bodyColor = '#fb923c';
      } else if (p.type === 'SPREAD') {
        glowColor = 'rgba(245, 158, 11, 0.6)';
        bodyColor = '#fbbf24';
      }

      // 2. Trailing speed streak pointing backwards
      const speed2D = Math.hypot(p.vx, p.vy);
      if (speed2D > 0.05) {
        const trailLength = Math.min(rad * 2.4, 40);
        const trailAngle = Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.rotate(trailAngle);

        const trailGrad = ctx.createLinearGradient(-trailLength, 0, 0, 0);
        trailGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
        trailGrad.addColorStop(0.6, glowColor);
        trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(0, -rad * 0.45);
        ctx.lineTo(-trailLength, 0);
        ctx.lineTo(0, rad * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 3. Warm fiery outer glow halo (High contrast against navy/cyan background)
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, rad * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 4. Saturated golden/orange body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // 5. Ultra-bright white-hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Enemy Crimson Laser Blast from above
      const rad = p.radius || 12;

      // 1. Red glowing halo
      ctx.fillStyle = 'rgba(255, 0, 85, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, rad * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 2. Bright neon red body
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();

      // 3. Bright yellow-hot core
      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawExplosion(exp: ExplosionFX, atlas: ReturnType<typeof getSpriteAtlas>) {
    const { ctx } = this;
    const pt = this.project(exp.x, exp.y, exp.z);

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.scale(pt.scale * exp.scale, pt.scale * exp.scale);

    const frames = exp.type === 'LARGE' ? atlas.explosionLarge : atlas.explosionSmall;
    if (frames && frames.length > 0) {
      const frameIdx = Math.min(Math.max(0, exp.frame || 0), frames.length - 1);
      const frameImg = frames[frameIdx];
      if (frameImg) {
        this.safeDrawImage(frameImg, -64, -64, 128, 128);
      }
    }

    ctx.restore();
  }

  private renderParticles() {
    const { ctx } = this;
    this.particles.forEach((p) => {
      const pt = this.project(p.x, p.y, p.z);
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(p.alpha, 0);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.size * pt.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
