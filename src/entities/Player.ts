import Phaser from 'phaser';
import { PLAYER, HEALTH } from '../config';

/**
 * Rainbow Fish. Owns movement, facing, and damage/invulnerability state.
 * Bubble firing is driven by GameScene (which owns the bubble pool).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  /** +1 facing right, -1 facing left. Idle keeps last horizontal facing. (§2.1) */
  facing: 1 | -1 = 1;
  invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fish');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(true);
    const r = (this.width * PLAYER.hitboxScale) / 2;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);

    // Source art faces LEFT; the player starts swimming right, so face right.
    this.setFacing(1);
  }

  /** Apply normalized movement from input axes (-1..1). */
  move(ax: number, ay: number): void {
    const len = Math.hypot(ax, ay);
    if (len > 0) {
      const nx = ax / len;
      const ny = ay / len;
      this.body.setVelocity(nx * PLAYER.speedX, ny * PLAYER.speedY);
    } else {
      this.body.setVelocity(0, 0);
    }

    if (ax > 0) this.setFacing(1);
    else if (ax < 0) this.setFacing(-1);
  }

  /** Public so GameScene can align facing to the mouse aim direction. */
  setFacing(dir: 1 | -1): void {
    this.facing = dir;
    // Base texture faces left, so mirror (flipX) when facing right.
    this.setFlipX(dir === 1);
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  /** Returns true if damage was actually applied (not blocked by i-frames). */
  takeHit(): boolean {
    if (this.isInvulnerable) return false;
    this.invulnerableUntil = this.scene.time.now + HEALTH.invulnMs;
    this.startFlicker();
    return true;
  }

  private startFlicker(): void {
    // Alpha 0.4 <-> 1.0 every 100ms for the invulnerability window. (§3.1)
    const blinks = Math.floor(HEALTH.invulnMs / HEALTH.flickerMs);
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.4 },
      duration: HEALTH.flickerMs,
      yoyo: true,
      repeat: Math.max(0, Math.floor(blinks / 2) - 1),
      onComplete: () => this.setAlpha(1),
    });
  }
}
