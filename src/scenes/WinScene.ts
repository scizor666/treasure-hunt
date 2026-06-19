import Phaser from 'phaser';
import { VIEWPORT } from '../config';
import { resetRun } from '../systems/GameState';

export class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene');
  }

  create(): void {
    const { width, height } = VIEWPORT;
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a4a6e, 0x1a4a6e, 0x0d2f4a, 0x0d2f4a, 1);
    g.fillRect(0, 0, width, height);

    this.sound.play('sfx-win', { volume: 0.6 });

    this.add
      .text(width / 2, height / 2 - 110, 'You found all treasures!', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '60px',
        color: '#ffffff',
        stroke: '#0d2f4a',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add.image(width / 2 - 60, height / 2 + 10, 'shell').setScale(1.6);
    this.add.image(width / 2 + 60, height / 2 + 10, 'star').setScale(1.6);

    // Celebratory sparkle burst.
    this.add.particles(width / 2, height / 2 - 40, 'sparkle', {
      speed: { min: 60, max: 220 },
      lifespan: 1600,
      scale: { start: 1, end: 0 },
      quantity: 2,
      frequency: 90,
      blendMode: 'ADD',
    });

    this.add
      .text(width / 2, height / 2 + 130, 'Press Enter or R to play again', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#cdeefb',
      })
      .setOrigin(0.5);

    const again = () => {
      resetRun(this.registry);
      this.scene.start('MenuScene');
    };

    this.input.keyboard?.once('keydown-ENTER', again);
    this.input.keyboard?.once('keydown-R', again);
    this.input.once('pointerdown', again);
  }
}
