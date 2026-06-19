import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { DESIGN_HEIGHT, designWidth } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { WinScene } from './scenes/WinScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: designWidth(),
  height: DESIGN_HEIGHT,
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
    // FIT scales the (aspect-matched) canvas to fill the window with no bars.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene, WinScene],
};

const game = new Phaser.Game(config);

// Keep the internal width matched to the window aspect (height stays 720) so
// there's never a letterbox, including across fullscreen and orientation.
function matchAspect(): void {
  const w = designWidth();
  if (Math.abs(game.scale.width - w) > 1 || game.scale.height !== DESIGN_HEIGHT) {
    game.scale.setGameSize(w, DESIGN_HEIGHT);
  }
}
window.addEventListener('resize', matchAspect);
window.addEventListener('orientationchange', matchAspect);
game.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, matchAspect);
game.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, matchAspect);

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
