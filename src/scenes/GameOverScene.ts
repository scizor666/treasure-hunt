import Phaser from 'phaser';
import { DESIGN_HEIGHT } from '../config';
import { resetRun } from '../systems/GameState';
import { addFullscreenButton } from '../ui/fullscreen';

export class GameOverScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.Graphics;
  private centered: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('GameOverScene');
  }

  create(): void {
    this.centered = [];
    const cy = DESIGN_HEIGHT / 2;
    this.backdrop = this.add.graphics().setDepth(-1);

    this.sound.play('sfx-gameover', { volume: 0.6 });

    this.centered.push(
      this.add
        .text(0, cy - 80, 'Oh no! Try again?', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '64px',
          color: '#ffd9e0',
          stroke: '#1a0d14',
          strokeThickness: 8,
        })
        .setOrigin(0.5),
      this.add
        .text(0, cy + 20, 'Press Enter / R, click, or tap to restart from Level 1', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '24px',
          color: '#f0c0cc',
        })
        .setOrigin(0.5),
    );

    const restart = () => {
      resetRun(this.registry);
      this.scene.start('GameScene');
    };

    this.input.topOnly = true;
    this.add
      .zone(0, 0, this.scale.width, DESIGN_HEIGHT)
      .setOrigin(0)
      .setDepth(0)
      .setInteractive()
      .once('pointerup', restart);
    addFullscreenButton(this);
    this.input.keyboard?.once('keydown-ENTER', restart);
    this.input.keyboard?.once('keydown-R', restart);

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
    this.backdrop.fillGradientStyle(0x3a2030, 0x3a2030, 0x1a0d14, 0x1a0d14, 1);
    this.backdrop.fillRect(0, 0, w, DESIGN_HEIGHT);
    for (const obj of this.centered) {
      (obj as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject).x = w / 2;
    }
  }
}
