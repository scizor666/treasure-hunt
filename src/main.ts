import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { VIEWPORT } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { WinScene } from './scenes/WinScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  parent: 'game-container',
  backgroundColor: '#1a4a6e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false, // toggled at runtime via the D key in dev (see GameScene)
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene, WinScene],
};

new Phaser.Game(config);

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
