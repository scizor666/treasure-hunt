import Phaser from 'phaser';
import { DESIGN_HEIGHT } from '../config';

export interface TouchControlsOpts {
  onPause: () => void;
}

/**
 * On-screen controls for touch devices: a floating left-side virtual joystick
 * (8-directional, appears under the finger), a right-side fire button, and a
 * pause button. Keyboard/mouse remain fully functional alongside these.
 *
 * GameScene polls `moveVector` and `firing` each frame.
 */
export class TouchControls {
  readonly moveVector = new Phaser.Math.Vector2(0, 0);
  firing = false;

  private readonly radius = 72;
  private joyPointerId = -1;
  private firePointerId = -1;
  private base!: Phaser.GameObjects.Arc;
  private thumb!: Phaser.GameObjects.Arc;
  private baseX = 0;
  private baseY = 0;
  private joyZone!: Phaser.GameObjects.Zone;
  private fireBtn!: Phaser.GameObjects.Arc;
  private fireIcon!: Phaser.GameObjects.Image;
  private pauseBg!: Phaser.GameObjects.Arc;
  private pauseTxt!: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, opts: TouchControlsOpts) {
    // Allow the joystick + fire button (+ a spare) to be pressed at once.
    scene.input.addPointer(2);

    this.buildJoystick();
    this.buildFireButton();
    this.buildPauseButton(opts.onPause);

    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
    scene.input.on('pointerupoutside', this.onPointerUp, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.reposition, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** Re-anchor the right/edge controls when the window size changes. */
  private reposition(): void {
    const w = this.scene.scale.width;
    this.joyZone.setSize(w * 0.55, DESIGN_HEIGHT);
    this.joyZone.input?.hitArea.setTo(0, 0, w * 0.55, DESIGN_HEIGHT);
    this.fireBtn.setPosition(w - 110, DESIGN_HEIGHT - 110);
    this.fireIcon.setPosition(this.fireBtn.x, this.fireBtn.y);
    this.pauseBg.x = w - 128;
    this.pauseTxt.x = this.pauseBg.x;
  }

  private buildJoystick(): void {
    const w = this.scene.scale.width;
    // Input zone covering the left ~55% of the screen.
    this.joyZone = this.scene.add
      .zone(0, 0, w * 0.55, DESIGN_HEIGHT)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1490)
      .setInteractive();
    this.joyZone.on('pointerdown', this.onJoyDown, this);

    this.base = this.scene.add
      .circle(0, 0, this.radius, 0xffffff, 0.14)
      .setStrokeStyle(3, 0xffffff, 0.3)
      .setScrollFactor(0)
      .setDepth(1500)
      .setVisible(false);
    this.thumb = this.scene.add
      .circle(0, 0, this.radius * 0.46, 0xa8e6ff, 0.4)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(1501)
      .setVisible(false);
  }

  private buildFireButton(): void {
    const x = this.scene.scale.width - 110;
    const y = DESIGN_HEIGHT - 110;
    const btn = this.scene.add
      .circle(x, y, 64, 0xa8e6ff, 0.22)
      .setStrokeStyle(3, 0xffffff, 0.45)
      .setScrollFactor(0)
      .setDepth(1500)
      .setInteractive({ useHandCursor: true });
    this.fireBtn = btn;
    this.fireIcon = this.scene.add
      .image(x, y, 'bubble')
      .setScale(2.4)
      .setAlpha(0.9)
      .setScrollFactor(0)
      .setDepth(1501);

    btn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.firing = true;
      this.firePointerId = p.id;
      btn.setScale(0.92);
    });
    const release = () => btn.setScale(1);
    btn.on('pointerup', release);
    btn.on('pointerout', release);
  }

  private buildPauseButton(onPause: () => void): void {
    const x = this.scene.scale.width - 128;
    const y = 40;
    this.pauseBg = this.scene.add
      .circle(x, y, 26, 0x0d2f4a, 0.55)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setScrollFactor(0)
      .setDepth(2500)
      .setInteractive({ useHandCursor: true });
    this.pauseTxt = this.scene.add
      .text(x, y, '❚❚', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2501);
    this.pauseBg.on('pointerup', onPause);
  }

  private onJoyDown(pointer: Phaser.Input.Pointer): void {
    if (this.joyPointerId !== -1) return;
    this.joyPointerId = pointer.id;
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this.base.setPosition(this.baseX, this.baseY).setVisible(true);
    this.thumb.setPosition(this.baseX, this.baseY).setVisible(true);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joyPointerId) return;
    let dx = pointer.x - this.baseX;
    let dy = pointer.y - this.baseY;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) {
      dx = (dx / len) * this.radius;
      dy = (dy / len) * this.radius;
    }
    this.thumb.setPosition(this.baseX + dx, this.baseY + dy);
    // Normalize to -1..1 with a small dead zone.
    const nx = dx / this.radius;
    const ny = dy / this.radius;
    this.moveVector.set(Math.abs(nx) < 0.18 ? 0 : nx, Math.abs(ny) < 0.18 ? 0 : ny);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joyPointerId) {
      this.joyPointerId = -1;
      this.moveVector.set(0, 0);
      this.base.setVisible(false);
      this.thumb.setVisible(false);
    }
    if (pointer.id === this.firePointerId) {
      this.firing = false;
      this.firePointerId = -1;
    }
  }

  private destroy(): void {
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointerupoutside', this.onPointerUp, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.reposition, this);
  }
}
