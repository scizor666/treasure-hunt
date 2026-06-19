import Phaser from 'phaser';
import { BUBBLE } from '../config';

/**
 * A single bubble projectile. Managed by a Phaser group acting as a pool in
 * GameScene; deactivated on lifetime expiry, off-screen, or enemy hit. (§2.1)
 */
export class Bubble extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private dieAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bubble');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.disable();
  }

  fire(x: number, y: number, vx: number, vy: number): void {
    this.enableBody(true, x, y, true, true);
    this.setVelocity(vx, vy);
    this.body.setAllowGravity(false);
    this.dieAt = this.scene.time.now + BUBBLE.lifetimeMs;
    this.setActive(true).setVisible(true);
    // Gentle wobble for life.
    this.scene.tweens.add({
      targets: this,
      scale: { from: 0.8, to: 1.05 },
      duration: 160,
      yoyo: true,
      repeat: -1,
    });
  }

  disable(): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1);
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    const cam = this.scene.cameras.main;
    const offscreen =
      this.x < cam.scrollX - 50 ||
      this.x > cam.scrollX + cam.width + 50 ||
      this.y < -50 ||
      this.y > this.scene.scale.height + cam.scrollY + 50;
    if (time >= this.dieAt || offscreen) {
      this.disable();
    }
  }
}
