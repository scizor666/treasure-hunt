import Phaser from 'phaser';
import { HEALTH } from '../config';

/**
 * Top-left heart display. Full hearts up to current HP, outline hearts beyond.
 * Fixed to the camera (scrollFactor 0). (§3.1 / §6.2)
 */
export class HeartsHUD {
  private icons: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, hp: number) {
    const spacing = 40;
    const x0 = 24;
    const y = 24;
    for (let i = 0; i < HEALTH.startHP; i++) {
      const img = scene.add
        .image(x0 + i * spacing, y, 'heart-full')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1000);
      this.icons.push(img);
    }
    this.set(hp);
  }

  set(hp: number): void {
    this.icons.forEach((icon, i) => {
      icon.setTexture(i < hp ? 'heart-full' : 'heart-empty');
    });
  }
}
