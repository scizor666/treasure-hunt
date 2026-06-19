import Phaser from 'phaser';
import { OCTOPUS } from '../config';
import { Player } from '../entities/Player';
import { HeartsHUD } from '../ui/HeartsHUD';

/**
 * Owns HP, hearts HUD, and the damage rule (1 bite = -1 HP, gated by player
 * invulnerability frames). Reports death so GameScene can end the run. (§3)
 */
export class CombatSystem {
  hp: number;
  private hud: HeartsHUD;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    startHP: number,
    private onDeath: () => void,
  ) {
    this.hp = startHP;
    this.hud = new HeartsHUD(scene, startHP);
  }

  /** Attempt a bite. Returns true if damage landed (i-frames not active). */
  applyBite(): boolean {
    if (!this.player.takeHit()) return false; // blocked by invulnerability
    this.hp = Math.max(0, this.hp - OCTOPUS.biteDamage);
    this.hud.set(this.hp);
    this.scene.sound.play('sfx-bite', { volume: 0.5 });
    this.scene.cameras.main.shake(120, 0.006);
    if (this.hp <= 0) this.onDeath();
    return true;
  }
}
