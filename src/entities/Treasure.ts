import Phaser from 'phaser';

/**
 * Level-ending pickup at the far right. Collected on player overlap. (§2.3)
 */
export class Treasure extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: 'shell' | 'star') {
    super(scene, x, y, type);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    // Idle bob so it reads as collectible.
    scene.tweens.add({
      targets: this,
      y: y - 10,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Scale pulse + sparkle burst on pickup; resolves when feedback is done. */
  collect(onDone: () => void): void {
    if (this.collected) return;
    this.collected = true;
    this.body.enable = false;

    this.scene.add.particles(this.x, this.y, 'sparkle', {
      speed: { min: 80, max: 260 },
      lifespan: 900,
      scale: { start: 1, end: 0 },
      quantity: 20,
      blendMode: 'ADD',
      emitting: false,
    }).explode(20);

    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.6 },
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Back.easeIn',
      onComplete: onDone,
    });
  }
}
