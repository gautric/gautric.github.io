// ============ CONSTANTS ============

// Scene
export const BG_COLOR = 0x151729;
export const CAMERA_D = 20;
export const CAMERA_INITIAL = { x: 30, y: 30, z: 30 };
export const CAMERA_ZOOM = 1.2;
export const CAMERA_TOP_Y = 60;
export const ORBIT_MAX_ZOOM = 4;
export const ORBIT_MIN_ZOOM = 0.05;

// Lights
export const AMBIENT_COLOR = 0x757f8e;
export const AMBIENT_INTENSITY = 5;
export const DIR_LIGHT_COLOR = 0xfffecd;
export const DIR_LIGHT_INTENSITY = 3;
export const DIR_LIGHT_SHADOW_SIZE = 2048;
export const DIR_LIGHT_SHADOW_EXTENT = 30;
export const DIR_LIGHT_OFFSET = 60;
export const DIR_LIGHT_Y = 80;
export const SPOT_COLOR = 0xffc100;
export const SPOT_INTENSITY = 20;
export const SPOT_DISTANCE = 40;
export const SPOT_ANGLE = Math.PI / 16;
export const SPOT_PENUMBRA = 0.02;
export const SPOT_DECAY = 2;
export const SPOT_POSITION = { x: -10, y: 15, z: 0 };

// Post-processing
export const DEFAULT_PIXEL_SIZE = 1;
export const NORMAL_EDGE_STRENGTH = 0.3;
export const DEPTH_EDGE_STRENGTH = 0.4;

// Floor / checker
export const CHECKER_SIZE = 4;
export const CHECKER_DARK = '#2a2f4a';
export const CHECKER_LIGHT = '#1a1f3a';

// Grid
export const DEFAULT_GRID_SIZE = 40;

// Cell geometry
export const CELL_SIZE = 0.8;
export const CELL_ALIVE_COLOR = 0x68b7e9;
export const CELL_GLOW_COLOR = 0x4f7e8b;
export const CELL_SHININESS = 10;
export const CELL_SPECULAR = 0xffffff;
export const CELL_BORN_COLOR = 0x44cc66;
export const CELL_BORN_GLOW = 0x227733;
export const CELL_DYING_COLOR = 0xdd4444;
export const CELL_DYING_GLOW = 0x882222;
export const CELL_FLOAT_Y = 0.4;
export const CELL_BOB_SPEED = 0.003;
export const CELL_BOB_AMP = 0.03;
export const CELL_TRANSITION_DURATION = 0.2;

// Randomise density
export const RANDOM_DENSITY = 0.3;

// Minimap
export const MINIMAP_SIZE = 140;
export const MINIMAP_BG = '#0d0f1a';
export const MINIMAP_ALIVE = '#68b7e9';
export const MINIMAP_DEAD = '#1a1f3a';
export const MINIMAP_FRAME_INTERVAL = 5;

// Compass
export const COMPASS_SIZE = 80;
export const COMPASS_NEEDLE_COLOR = '#ffc100';
export const COMPASS_BACK_COLOR = 'rgba(200,208,224,0.3)';
export const COMPASS_TEXT_COLOR = '#c8d0e0';
export const COMPASS_FONT = '10px DotGothic16';
export const COMPASS_NEEDLE_LEN = 28;
export const COMPASS_NEEDLE_HALF = 6;
export const COMPASS_NEEDLE_TAIL = 8;
export const COMPASS_LABEL_R = 34;

// Raycaster
export const CLICK_THRESHOLD = 4;

// Speed slider
export const SPEED_SLIDER = { min: 10, max: 1000, value: 200, step: 10 };
export const DEFAULT_TICK_INTERVAL = 0.2;

// Pixel size slider
export const PIXEL_SLIDER = { min: 1, max: 16, value: 1, step: 1 };

// Grid size slider
export const GRID_SLIDER = { min: 10, max: 120, value: 40, step: 5 };
