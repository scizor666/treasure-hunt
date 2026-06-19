import Phaser from 'phaser';
import { COLORS } from '../config';
import type { LevelDefinition, Rect } from '../levels/types';

export interface LoadedLevel {
  def: LevelDefinition;
  walls: Phaser.Physics.Arcade.StaticGroup;
}

/**
 * Reads a level JSON (preloaded by key), paints parallax + walls, and returns
 * the static collision group. Octopuses/treasure/player are spawned by
 * GameScene from the returned definition. (§4.6)
 */
export function loadLevel(scene: Phaser.Scene, key: string): LoadedLevel {
  const def = scene.cache.json.get(key) as LevelDefinition;
  if (!def) throw new Error(`Level data not found for key "${key}"`);

  paintBackground(scene, def);

  const walls = scene.physics.add.staticGroup();
  for (const w of def.walls) {
    addWall(scene, walls, w);
  }

  scene.physics.world.setBounds(0, 0, def.width, def.height);
  return { def, walls };
}

function paintBackground(scene: Phaser.Scene, def: LevelDefinition): void {
  // Base gradient fixed to the camera.
  const g = scene.add.graphics().setScrollFactor(0).setDepth(-100);
  g.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
  g.fillRect(0, 0, scene.scale.width, scene.scale.height);

  // Parallax depth bands using tiled seaweed silhouettes.
  const layers = def.parallaxLayers ?? [
    { texture: 'seaweed', scrollFactor: 0.3 },
    { texture: 'seaweed', scrollFactor: 0.6 },
  ];
  layers.forEach((layer, i) => {
    if (!layer.texture) return;
    const depth = -90 + i;
    const tint = i === 0 ? 0x0d3550 : 0x14507a;
    const ts = scene.add
      .tileSprite(0, def.height - 160 - i * 40, def.width * 1.5, 220, layer.texture)
      .setOrigin(0, 0)
      .setScrollFactor(layer.scrollFactor)
      .setTint(tint)
      .setAlpha(0.5)
      .setDepth(depth);
    ts.setData('parallax', true);
  });

  // Ambient drifting bubbles.
  scene.add
    .particles(0, 0, 'bubble', {
      x: { min: 0, max: scene.scale.width },
      y: scene.scale.height + 10,
      lifespan: 6000,
      speedY: { min: -40, max: -15 },
      scale: { min: 0.2, max: 0.5 },
      alpha: { start: 0.5, end: 0 },
      frequency: 500,
      quantity: 1,
    })
    .setScrollFactor(0)
    .setDepth(-80);
}

function addWall(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  w: Rect,
): void {
  // Decide texture: thin top/bottom slabs are "rock" floor/ceiling; the rest coral.
  const isBoundary = w.height <= 48 || w.width <= 48;
  const key = isBoundary ? 'rock' : 'coral';

  const tile = scene.add
    .tileSprite(w.x, w.y, w.width, w.height, key)
    .setOrigin(0, 0)
    .setDepth(-10);

  const body = group.create(
    w.x + w.width / 2,
    w.y + w.height / 2,
    key,
  ) as Phaser.Physics.Arcade.Sprite;
  body.setVisible(false);
  const staticBody = body.body as Phaser.Physics.Arcade.StaticBody;
  staticBody.setSize(w.width, w.height);
  staticBody.updateFromGameObject();
  body.setData('tile', tile);
}
