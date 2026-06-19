import Phaser from 'phaser';
import { OCTOPUS } from '../config';
import type { OctopusSpawn, Vec2 } from '../levels/types';

type State = 'hidden' | 'patrol' | 'chase' | 'neutralized';

/**
 * Mad Octopus rival. Implements the AI state machine from SPEC.md §2.2 / §4.5:
 *   PATROL/AMBUSH -> (detect/trigger) -> CHASE -> (bite range) -> BITE -> CHASE
 *   CHASE -> (player leaves lose radius for 2s) -> PATROL
 *   any -> NEUTRALIZED (terminal) on bubble hit
 */
export class Octopus extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  readonly spawn: OctopusSpawn;
  state: State;
  neutralized = false;

  private waypoints: Vec2[];
  private wpIndex = 0;
  private pauseUntil = 0;
  private biteReadyAt = 0;
  private outOfRangeSince = 0;
  /** Resting position used to anchor patrol when no waypoints are defined. */
  private home: Vec2;
  /** Debug-overlay flag set by GameScene each frame the trigger fires. */
  triggered = false;

  constructor(scene: Phaser.Scene, spawn: OctopusSpawn) {
    super(scene, spawn.x, spawn.y, 'octopus');
    this.spawn = spawn;
    this.home = { x: spawn.x, y: spawn.y };
    this.waypoints =
      spawn.waypoints.length > 0 ? spawn.waypoints : [{ x: spawn.x, y: spawn.y }];

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const bw = this.width * 0.7;
    const bh = this.height * 0.7;
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw) / 2, (this.height - bh) / 2);
    this.body.setAllowGravity(false);
    // Not immovable: must be separated by static walls when patrolling/chasing.
    // The player has no physics collider with octopuses (bites are AI range
    // checks), so it won't push them around.

    if (spawn.pattern === 'patrol') {
      this.state = 'patrol';
    } else {
      // ambush / drop-in / surge-up start concealed until their trigger fires.
      this.state = 'hidden';
      this.applyHiddenStart();
    }
  }

  private applyHiddenStart(): void {
    const { pattern } = this.spawn;
    if (pattern === 'ambush') {
      this.setAlpha(this.spawn.hiddenUntilTrigger === false ? 0.25 : 0);
    } else if (pattern === 'drop-in') {
      // Park above the visible play area.
      this.y = this.home.y - 400;
      this.setAlpha(1);
    } else if (pattern === 'surge-up') {
      // Park below the floor line.
      this.y = this.home.y + 400;
      this.setAlpha(1);
    }
    this.body.setVelocity(0, 0);
  }

  /** Called by GameScene when the player enters this octopus's trigger zone. */
  reveal(): void {
    if (this.state !== 'hidden') return;
    this.state = 'chase';
    const { pattern } = this.spawn;
    if (pattern === 'ambush') {
      this.scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
    } else if (pattern === 'drop-in' || pattern === 'surge-up') {
      this.scene.tweens.add({
        targets: this,
        y: this.home.y,
        duration: 360,
        ease: 'Quad.easeOut',
      });
    }
  }

  neutralize(): void {
    if (this.neutralized) return;
    this.neutralized = true;
    this.state = 'neutralized';
    this.body.setVelocity(0, 0);
    this.setAlpha(OCTOPUS.neutralizedAlpha);
    this.setTint(OCTOPUS.neutralizedTint);
    // Small dizzy spin to read as "deflated". (§3.2)
    this.scene.tweens.add({
      targets: this,
      angle: { from: -8, to: 8 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private detects(player: Phaser.Math.Vector2): boolean {
    const dx = (player.x - this.x) / OCTOPUS.detectRadiusX;
    const dy = (player.y - this.y) / OCTOPUS.detectRadiusY;
    return dx * dx + dy * dy <= 1;
  }

  private faceToward(targetX: number): void {
    // Sprite mouth faces right by default; flip when moving/looking left.
    this.setFlipX(targetX < this.x);
  }

  /**
   * @param onBite invoked when a bite lands in range; returns true if it dealt
   *               damage (false if blocked by player i-frames).
   */
  update(
    time: number,
    _delta: number,
    player: Phaser.Math.Vector2,
    onBite: () => boolean,
  ): void {
    if (this.state === 'neutralized' || this.state === 'hidden') return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (this.state === 'patrol') {
      this.patrol(time);
      if (this.detects(player)) {
        this.state = 'chase';
        this.outOfRangeSince = 0;
      }
      return;
    }

    // CHASE
    this.faceToward(player.x);
    this.scene.physics.moveTo(this, player.x, player.y, OCTOPUS.chaseSpeed);

    if (dist <= OCTOPUS.biteRange && time >= this.biteReadyAt) {
      this.biteReadyAt = time + OCTOPUS.biteCooldownMs;
      this.playBite();
      onBite();
    }

    // Lose aggro: outside lose radius continuously for loseAggroMs -> patrol.
    if (dist > OCTOPUS.loseRadius) {
      if (this.outOfRangeSince === 0) this.outOfRangeSince = time;
      else if (time - this.outOfRangeSince >= OCTOPUS.loseAggroMs) {
        this.state = 'patrol';
        this.outOfRangeSince = 0;
        // Return toward home/patrol; ambush types do not re-hide. (§2.2)
        this.home = { x: this.x, y: this.y };
      }
    } else {
      this.outOfRangeSince = 0;
    }
  }

  private patrol(time: number): void {
    if (time < this.pauseUntil) {
      this.body.setVelocity(0, 0);
      return;
    }
    const target = this.waypoints[this.wpIndex];
    const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (d < 8) {
      this.body.setVelocity(0, 0);
      this.pauseUntil = time + OCTOPUS.waypointPauseMs;
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      return;
    }
    this.faceToward(target.x);
    this.scene.physics.moveTo(this, target.x, target.y, OCTOPUS.patrolSpeed);
  }

  private playBite(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: { from: 1, to: 1.18 },
      scaleY: { from: 1, to: 0.86 },
      duration: 90,
      yoyo: true,
    });
  }
}
