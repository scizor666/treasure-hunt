import Phaser from 'phaser';
import { DESIGN_HEIGHT } from '../config';
import { resetRun } from '../systems/GameState';
import { addFullscreenButton } from '../ui/fullscreen';

export class WinScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.Graphics;
  private centered: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('WinScene');
  }

  create(): void {
    this.centered = [];
    const cy = DESIGN_HEIGHT / 2;
    this.backdrop = this.add.graphics().setDepth(-1);

    this.sound.play('sfx-win', { volume: 0.6 });

    this.centered.push(
      this.add
        .text(0, cy - 110, 'You found all treasures!', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '60px',
          color: '#ffffff',
          stroke: '#0d2f4a',
          strokeThickness: 8,
        })
        .setOrigin(0.5),
      this.add.image(-60, cy + 10, 'shell').setScale(1.6),
      this.add.image(60, cy + 10, 'star').setScale(1.6),
      this.add
        .text(0, cy + 130, 'Press Enter / R, click, or tap to play again', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '24px',
          color: '#cdeefb',
        })
        .setOrigin(0.5),
    );

    // Celebratory sparkle burst (anchored to center in layout()).
    const sparkles = this.add.particles(0, cy - 40, 'sparkle', {
      speed: { min: 60, max: 220 },
      lifespan: 1600,
      scale: { start: 1, end: 0 },
      quantity: 2,
      frequency: 90,
      blendMode: 'ADD',
    });
    this.centered.push(sparkles);

    const again = () => {
      resetRun(this.registry);
      this.scene.start('MenuScene');
    };

    this.input.topOnly = true;
    this.add
      .zone(0, 0, this.scale.width, DESIGN_HEIGHT)
      .setOrigin(0)
      .setDepth(0)
      .setInteractive()
      .once('pointerup', again);
    addFullscreenButton(this);
    this.input.keyboard?.once('keydown-ENTER', again);
    this.input.keyboard?.once('keydown-R', again);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this),
    );
  }

  private layout(): void {
    const w = this.scale.width;
    this.cameras.main.setSize(w, DESIGN_HEIGHT);
    this.backdrop.clear();
    this.backdrop.fillGradientStyle(0x1a4a6e, 0x1a4a6e, 0x0d2f4a, 0x0d2f4a, 1);
    this.backdrop.fillRect(0, 0, w, DESIGN_HEIGHT);
    // The two treasure images sit just left/right of center; everything else is centered.
    const shell = this.centered[1] as Phaser.GameObjects.Image;
    const star = this.centered[2] as Phaser.GameObjects.Image;
    for (let i = 0; i < this.centered.length; i++) {
      if (i === 1 || i === 2) continue;
      (this.centered[i] as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject).x = w / 2;
    }
    shell.x = w / 2 - 60;
    star.x = w / 2 + 60;
  }
}
