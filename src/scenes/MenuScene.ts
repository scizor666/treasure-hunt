import Phaser from 'phaser';
import { DESIGN_HEIGHT } from '../config';
import { resetRun } from '../systems/GameState';
import { addFullscreenButton } from '../ui/fullscreen';

export class MenuScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.Graphics;
  private centered: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.centered = [];
    this.backdrop = this.add.graphics().setDepth(-1);

    this.centered.push(
      this.add
        .text(0, 140, 'Treasure Hunt', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '72px',
          color: '#ffffff',
          stroke: '#0d2f4a',
          strokeThickness: 8,
        })
        .setOrigin(0.5),
      this.add.image(0, 250, 'fish', 0).setScale(1.4),
    );

    const instructions =
      'Swim with arrow keys / WASD (or the on-screen joystick on touch).\n' +
      "Shoot bubbles at octopuses — you don't have to beat them all, but\n" +
      "they'll get in your way! Reach the treasure at the end of each level.\n" +
      'You have 4 hearts — each bite costs one.';

    this.centered.push(
      this.add
        .text(0, 420, instructions, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '22px',
          color: '#cdeefb',
          align: 'center',
          lineSpacing: 8,
        })
        .setOrigin(0.5),
      this.makeButton(560, 'Play ▶', () => this.startGame()),
      this.add
        .text(0, 660, 'Press Enter, click, or tap Play', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '18px',
          color: '#8fc7e6',
        })
        .setOrigin(0.5),
    );

    addFullscreenButton(this);
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());

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
    for (const obj of this.centered) {
      (obj as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject).x = w / 2;
    }
  }

  private startGame(): void {
    // Go fullscreen on the way in — this runs inside a user gesture (tap/click/
    // key), which browsers require to allow fullscreen.
    if (this.scale.fullscreen.available && !this.scale.isFullscreen) {
      try {
        this.scale.startFullscreen();
      } catch {
        /* ignore — not all browsers allow it here */
      }
    }
    resetRun(this.registry);
    this.scene.start('GameScene');
  }

  /** Centered button; returns a container so layout can recenter its x. */
  private makeButton(y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const w = 220;
    const h = 64;
    const g = this.add.graphics();
    g.fillStyle(0x2f9e8f, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);

    const text = this.add
      .text(0, 0, label, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '30px', color: '#ffffff' })
      .setOrigin(0.5);

    const container = this.add.container(0, y, [g, text]);
    container.setSize(w, h).setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerover', () => text.setScale(1.08));
    container.on('pointerout', () => text.setScale(1));
    container.on('pointerup', onClick);
    return container;
  }
}
