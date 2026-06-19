import Phaser from 'phaser';

const MARGIN = 56;
const Y = 40;

/**
 * Adds a top-right fullscreen toggle button (and an `F` keyboard shortcut) to a
 * scene, anchored to the right edge across resize. Entering fullscreen requires
 * a user gesture, which the button tap / key press satisfies. No-ops silently
 * where the Fullscreen API is unavailable (the button is hidden in that case).
 */
export function addFullscreenButton(scene: Phaser.Scene): void {
  const toggle = () => {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else scene.scale.startFullscreen();
  };

  // `F` works everywhere even if the button is hidden.
  scene.input.keyboard?.on('keydown-F', toggle);

  if (!scene.scale.fullscreen.available) return;

  const r = 26;
  const bg = scene.add
    .circle(scene.scale.width - MARGIN, Y, r, 0x0d2f4a, 0.55)
    .setStrokeStyle(2, 0xffffff, 0.5)
    .setScrollFactor(0)
    .setDepth(2500)
    .setInteractive({ useHandCursor: true });

  const icon = scene.add
    .text(bg.x, Y, '⛶', { fontFamily: 'sans-serif', fontSize: '26px', color: '#ffffff' })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2501);

  const sync = () => icon.setText(scene.scale.isFullscreen ? '🗗' : '⛶');
  const reposition = () => {
    bg.x = scene.scale.width - MARGIN;
    icon.x = bg.x;
  };
  bg.on('pointerover', () => bg.setScale(1.1));
  bg.on('pointerout', () => bg.setScale(1));
  bg.on('pointerup', () => {
    toggle();
    sync();
  });
  scene.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, sync);
  scene.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, sync);
  scene.scale.on(Phaser.Scale.Events.RESIZE, reposition);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, sync);
    scene.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, sync);
    scene.scale.off(Phaser.Scale.Events.RESIZE, reposition);
  });
}
