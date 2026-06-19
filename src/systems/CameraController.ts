import Phaser from 'phaser';
import { CAMERA } from '../config';

/**
 * Horizontal-follow camera clamped to level bounds, with a soft vertical
 * deadzone keeping the player in the middle 50% of the screen. (§4.1)
 */
export function setupCamera(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  levelWidth: number,
  levelHeight: number,
): void {
  const cam = scene.cameras.main;
  cam.setBounds(0, 0, levelWidth, levelHeight);
  cam.startFollow(target, true, CAMERA.lerpX, CAMERA.lerpY);

  const dzHeight = cam.height * CAMERA.deadzoneHeightFraction;
  // Narrow horizontal deadzone => X tracks tightly via lerp; tall vertical band
  // (50% of screen) => soft vertical follow that keeps the player centered.
  cam.setDeadzone(48, dzHeight);
}
