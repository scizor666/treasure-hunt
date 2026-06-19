import Phaser from 'phaser';
import { resetRun } from '../systems/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    // Initialize the run state once at boot.
    resetRun(this.registry);
    this.scene.start('PreloadScene');
  }
}
