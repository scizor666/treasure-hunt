import Phaser from 'phaser';
import { BUBBLE, OCTOPUS, VIEWPORT, DEBUG_KEY } from '../config';
import { Player } from '../entities/Player';
import { Bubble } from '../entities/Bubble';
import { Octopus } from '../entities/Octopus';
import { Treasure } from '../entities/Treasure';
import { CombatSystem } from '../systems/CombatSystem';
import { loadLevel } from '../systems/LevelLoader';
import { setupCamera } from '../systems/CameraController';
import {
  getRun,
  setRun,
  LEVEL_KEYS,
  LEVEL_COUNT,
} from '../systems/GameState';
import type { LevelDefinition } from '../levels/types';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private octopuses!: Phaser.Physics.Arcade.Group;
  private bubbles!: Phaser.Physics.Arcade.Group;
  private treasure!: Treasure;
  private combat!: CombatSystem;
  private def!: LevelDefinition;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastFireAt = 0;
  private pointerFire = false;

  private playerPos = new Phaser.Math.Vector2();
  private transitioning = false;
  private paused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;

  private debug = false;
  private debugGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.transitioning = false;
    this.paused = false;
    this.pauseOverlay = undefined;

    const run = getRun(this.registry);
    const levelKey = LEVEL_KEYS[run.levelIndex];
    const { def, walls } = loadLevel(this, levelKey);
    this.def = def;

    // --- Entities ---
    this.player = new Player(this, def.playerSpawn.x, def.playerSpawn.y);

    this.octopuses = this.physics.add.group({ runChildUpdate: false });
    for (const spawn of def.octopuses) {
      this.octopuses.add(new Octopus(this, spawn));
    }

    this.bubbles = this.physics.add.group({
      classType: Bubble,
      runChildUpdate: true,
      maxSize: 32,
    });

    this.treasure = new Treasure(this, def.treasure.x, def.treasure.y, def.treasure.type);

    // --- Combat / HUD ---
    this.combat = new CombatSystem(this, this.player, run.hp, () => this.gameOver());

    // --- Collisions (§8.5) ---
    this.physics.add.collider(this.player, walls);
    this.physics.add.collider(this.octopuses, walls);
    this.physics.add.overlap(
      this.bubbles,
      this.octopuses,
      this.onBubbleHitsOctopus as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.treasure,
      this.onReachTreasure as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    // --- Camera ---
    setupCamera(this, this.player, def.width, def.height);

    // --- HUD ---
    this.buildHud();

    // --- Input ---
    this.setupInput();

    // --- Debug overlay ---
    this.debugGfx = this.add.graphics().setDepth(2000);
    this.debug = import.meta.env.DEV; // on by default in dev builds
    this.applyDebug();
  }

  private buildHud(): void {
    this.add
      .text(VIEWPORT.width / 2, 28, `Level ${getRun(this.registry).levelIndex + 1}: ${this.def.name}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        stroke: '#0d2f4a',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000);
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys('W,A,S,D,SPACE,ESC') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    kb.on('keydown-ESC', () => this.togglePause());
    kb.on(`keydown-${DEBUG_KEY}`, () => {
      this.debug = !this.debug;
      this.applyDebug();
    });

    this.input.on('pointerdown', () => {
      this.pointerFire = true;
    });
  }

  update(time: number, delta: number): void {
    if (this.paused || this.transitioning) return;

    // --- Movement input (normalized) ---
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const ax = (right ? 1 : 0) - (left ? 1 : 0);
    const ay = (down ? 1 : 0) - (up ? 1 : 0);
    this.player.move(ax, ay);

    // --- Firing ---
    if (this.keys.SPACE.isDown) this.tryFireKeyboard(time, ax, ay);
    if (this.pointerFire) {
      this.tryFirePointer(time);
      this.pointerFire = false;
    }

    // --- Octopus AI + ambush triggers ---
    this.playerPos.set(this.player.x, this.player.y);
    for (const obj of this.octopuses.getChildren()) {
      const o = obj as Octopus;
      this.checkTrigger(o);
      o.update(time, delta, this.playerPos, () => this.combat.applyBite());
    }

    if (this.debug) this.drawDebug();
  }

  private checkTrigger(o: Octopus): void {
    const t = o.spawn.trigger;
    if (!t || o.state !== 'hidden') {
      o.triggered = false;
      return;
    }
    const inside =
      this.player.x >= t.x &&
      this.player.x <= t.x + t.width &&
      this.player.y >= t.y &&
      this.player.y <= t.y + t.height;
    o.triggered = inside;
    if (inside) o.reveal();
  }

  // --- Firing helpers ---

  private activeBubbleCount(): number {
    return this.bubbles.countActive(true);
  }

  private tryFireKeyboard(time: number, ax: number, ay: number): void {
    if (!this.canFire(time)) return;
    let vx = 0;
    let vy = 0;
    if (ax !== 0) {
      vx = this.player.facing * BUBBLE.speed;
    } else if (ay !== 0) {
      vy = Math.sign(ay) * BUBBLE.speed; // vertical fire when only up/down held
    } else {
      vx = this.player.facing * BUBBLE.speed; // idle -> facing direction
    }
    this.spawnBubble(time, vx, vy);
  }

  private tryFirePointer(time: number): void {
    if (!this.canFire(time)) return;
    const p = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, world.x, world.y);
    this.spawnBubble(time, Math.cos(angle) * BUBBLE.speed, Math.sin(angle) * BUBBLE.speed);
    this.player.setFacing(world.x < this.player.x ? -1 : 1);
  }

  private canFire(time: number): boolean {
    return time >= this.lastFireAt + BUBBLE.cooldownMs && this.activeBubbleCount() < BUBBLE.maxOnScreen;
  }

  private spawnBubble(time: number, vx: number, vy: number): void {
    const b = this.bubbles.get(this.player.x, this.player.y) as Bubble | null;
    if (!b) return;
    b.fire(this.player.x, this.player.y, vx, vy);
    this.lastFireAt = time;
    this.sound.play('sfx-shoot', { volume: 0.35 });
  }

  // --- Overlap callbacks ---

  private onBubbleHitsOctopus = (bubbleObj: unknown, octoObj: unknown): void => {
    const bubble = bubbleObj as Bubble;
    const octo = octoObj as Octopus;
    if (!bubble.active) return;
    bubble.disable();
    if (octo.neutralized || octo.state === 'hidden') return; // only active rivals
    octo.neutralize();
    this.sound.play('sfx-neutralize', { volume: 0.5 });
  };

  private onReachTreasure = (): void => {
    if (this.treasure.collected || this.transitioning) return;
    this.transitioning = true;
    this.sound.play('sfx-pickup', { volume: 0.6 });
    this.treasure.collect(() => this.advanceLevel());
  };

  // --- Flow ---

  private advanceLevel(): void {
    const run = getRun(this.registry);
    const next = run.levelIndex + 1;
    if (next < LEVEL_COUNT) {
      setRun(this.registry, { levelIndex: next, hp: this.combat.hp });
      this.scene.restart();
    } else {
      this.scene.start('WinScene');
    }
  }

  private gameOver(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.time.delayedCall(300, () => this.scene.start('GameOverScene'));
  }

  // --- Pause (simple overlay, §5) ---

  private togglePause(): void {
    if (this.transitioning) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
      this.pauseOverlay = this.buildPauseOverlay();
    } else {
      this.physics.resume();
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  private buildPauseOverlay(): Phaser.GameObjects.Container {
    const { width, height } = VIEWPORT;
    const bg = this.add.rectangle(0, 0, width, height, 0x0d2f4a, 0.6).setOrigin(0);
    const txt = this.add
      .text(width / 2, height / 2, 'Paused\nPress Esc to resume', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    return this.add.container(0, 0, [bg, txt]).setScrollFactor(0).setDepth(3000);
  }

  // --- Debug overlay (§15.6) ---

  private applyDebug(): void {
    this.physics.world.drawDebug = this.debug;
    if (this.debug && !this.physics.world.debugGraphic) {
      this.physics.world.createDebugGraphic();
    }
    if (this.physics.world.debugGraphic) {
      this.physics.world.debugGraphic.setVisible(this.debug);
    }
    if (!this.debug) this.debugGfx.clear();
  }

  private drawDebug(): void {
    const g = this.debugGfx;
    g.clear();
    for (const obj of this.octopuses.getChildren()) {
      const o = obj as Octopus;
      // Detection ellipse (orange).
      g.lineStyle(2, 0xff9933, 0.7);
      g.strokeEllipse(o.x, o.y, OCTOPUS.detectRadiusX * 2, OCTOPUS.detectRadiusY * 2);
      // Trigger rect (cyan when armed, green when firing).
      const t = o.spawn.trigger;
      if (t) {
        g.lineStyle(2, o.triggered ? 0x33ff66 : 0x33ddff, 0.9);
        g.strokeRect(t.x, t.y, t.width, t.height);
      }
    }
  }
}
