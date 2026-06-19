// Level data contracts — see SPEC.md §4.5 / §4.6.

export type OctopusPattern = 'patrol' | 'ambush' | 'drop-in' | 'surge-up';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OctopusSpawn {
  x: number;
  y: number;
  pattern: OctopusPattern;
  waypoints: Vec2[];
  /** Required for ambush / drop-in / surge-up. World-space activation rectangle. */
  trigger?: Rect;
  /** Hidden (invisible) until the player enters the trigger. */
  hiddenUntilTrigger?: boolean;
}

export interface ParallaxLayer {
  /** Texture key registered in PreloadScene, or a solid color fill if omitted. */
  texture?: string;
  color?: number;
  /** 0 = static with camera, 1 = moves with world. */
  scrollFactor: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  playerSpawn: Vec2;
  treasure: { type: 'shell' | 'star'; x: number; y: number };
  /** Floor, ceiling, coral, rocks — solid AABBs in world space. */
  walls: Rect[];
  parallaxLayers?: ParallaxLayer[];
  octopuses: OctopusSpawn[];
  /** Calm-stretch budget before the treasure (debug/validation aid). */
  calmBeforeTreasure?: number;
}
