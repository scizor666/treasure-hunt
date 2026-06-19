import Phaser from 'phaser';
import { VIEWPORT } from '../config';
import { resetRun } from '../systems/GameState';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(): void {
    const { width, height } = VIEWPORT;
    const g = this.add.graphics();
    g.fillGradientStyle(0x3a2030, 0x3a2030, 0x1a0d14, 0x1a0d14, 1);
    g.fillRect(0, 0, width, height);

    this.sound.play('sfx-gameover', { volume: 0.6 });

    this.add
      .text(width / 2, height / 2 - 80, 'Oh no! Try again?', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '64px',
        color: '#ffd9e0',
        stroke: '#1a0d14',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 20, 'Press Enter or R to restart from Level 1', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#f0c0cc',
      })
      .setOrigin(0.5);

    const restart = () => {
      resetRun(this.registry);
      this.scene.start('GameScene');
    };

    this.input.keyboard?.once('keydown-ENTER', restart);
    this.input.keyboard?.once('keydown-R', restart);
    this.input.once('pointerdown', restart);
  }
}
