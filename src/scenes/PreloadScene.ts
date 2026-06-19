import Phaser from 'phaser';
import { asset, VIEWPORT, COLORS } from '../config';
import { LEVEL_KEYS } from '../systems/GameState';

/**
 * Loads vectorized PNG sprites, level JSON, and audio. Shows a progress bar.
 * All paths go through asset() so they respect Vite's base on GitHub Pages.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.drawProgressBar();

    // Sprites (vectorized from references — see assets/svg).
    this.load.image('fish', asset('assets/png/rainbow-fish.png'));
    this.load.image('octopus', asset('assets/png/octopus.png'));
    this.load.image('shell', asset('assets/png/shell.png'));
    this.load.image('star', asset('assets/png/star.png'));
    this.load.image('bubble', asset('assets/png/bubble.png'));
    this.load.image('heart-full', asset('assets/png/heart-full.png'));
    this.load.image('heart-empty', asset('assets/png/heart-empty.png'));
    this.load.image('coral', asset('assets/png/coral.png'));
    this.load.image('rock', asset('assets/png/rock.png'));
    this.load.image('sparkle', asset('assets/png/sparkle.png'));
    this.load.image('seaweed', asset('assets/png/seaweed.png'));

    // Level data.
    for (const key of LEVEL_KEYS) {
      this.load.json(key, asset(`assets/levels/${key}.json`));
    }

    // Audio (placeholder SFX — optional per §10).
    this.load.audio('sfx-shoot', asset('assets/audio/shoot.wav'));
    this.load.audio('sfx-bite', asset('assets/audio/bite.wav'));
    this.load.audio('sfx-neutralize', asset('assets/audio/neutralize.wav'));
    this.load.audio('sfx-pickup', asset('assets/audio/pickup.wav'));
    this.load.audio('sfx-gameover', asset('assets/audio/gameover.wav'));
    this.load.audio('sfx-win', asset('assets/audio/win.wav'));
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  private drawProgressBar(): void {
    const { width, height } = VIEWPORT;
    const barW = 420;
    const barH = 28;
    const x = (width - barW) / 2;
    const y = height / 2;

    this.add
      .text(width / 2, y - 50, 'Treasure Hunt', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '40px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const frame = this.add.graphics();
    frame.lineStyle(3, COLORS.bubble, 1);
    frame.strokeRoundedRect(x, y, barW, barH, 8);

    const fill = this.add.graphics();
    this.load.on('progress', (p: number) => {
      fill.clear();
      fill.fillStyle(COLORS.bubble, 1);
      fill.fillRoundedRect(x + 4, y + 4, (barW - 8) * p, barH - 8, 5);
    });
  }
}
