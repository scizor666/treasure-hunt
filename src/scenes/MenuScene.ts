import Phaser from 'phaser';
import { VIEWPORT } from '../config';
import { resetRun } from '../systems/GameState';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width } = VIEWPORT;
    this.drawBackdrop();

    this.add
      .text(width / 2, 140, 'Treasure Hunt', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '72px',
        color: '#ffffff',
        stroke: '#0d2f4a',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add.image(width / 2, 250, 'fish', 0).setScale(1.4);

    const instructions =
      'Swim with arrow keys or WASD. Press Space to shoot bubbles at\n' +
      "octopuses — you don't have to beat them all, but they'll get in\n" +
      'your way! Reach the treasure at the end of each level.\n' +
      'You have 4 hearts — each bite costs one.';

    this.add
      .text(width / 2, 420, instructions, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '22px',
        color: '#cdeefb',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.makeButton(width / 2, 560, 'Play ▶', () => {
      resetRun(this.registry);
      this.scene.start('GameScene');
    });

    this.add
      .text(width / 2, 660, 'Press Enter or click Play', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#8fc7e6',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    resetRun(this.registry);
    this.scene.start('GameScene');
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const w = 220;
    const h = 64;
    const g = this.add.graphics();
    g.fillStyle(0x2f9e8f, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);

    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '30px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => text.setScale(1.08));
    zone.on('pointerout', () => text.setScale(1));
    zone.on('pointerdown', onClick);
  }

  private drawBackdrop(): void {
    const { width, height } = VIEWPORT;
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a4a6e, 0x1a4a6e, 0x0d2f4a, 0x0d2f4a, 1);
    g.fillRect(0, 0, width, height);
  }
}
