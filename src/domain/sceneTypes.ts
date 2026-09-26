export type FormationPreset = 'arc' | 'row' | 'grid-2x2' | 'flank';

export type CharacterPoseId =
  | 'idle'
  | 'pickup'
  | 'thumbsUp'
  | 'shocked'
  | 'agony'
  | 'cheer'
  | 'crying';

export interface Vec2 {
  x: number;
  y: number;
}

export interface CameraConfig {
  zoom: number;
  panX: number;
  panY: number;
}

export interface BackdropFilterConfig {
  vignetteIntensity: number; // 0..100
  backdropDimming: number;   // 0..100
  depthBlur: number;         // 0..8 px
}

export interface EditorOverlayConfig {
  showSafeZoneOverlay: boolean;
  showSnapGrid: boolean;
}

export interface PedestalSlotNode {
  id: string;
  itemId: number;
  itemName: string;
  quality: 0 | 1 | 2 | 3 | 4;
  altarStyle: 'stone' | 'gold' | 'devil' | 'angel' | 'hidden';
  priceTag: 'none' | '1-heart' | '2-hearts' | '15c' | 'blind';
  highlightFx: 'none' | 'outline' | 'q4-glow';
  manualOffset?: Vec2;
  rotationDeg?: number;
}

export type TextFontFamilyId = 'upheaval' | 'team-meat' | 'space-grotesk';
export type TextAlignMode = 'left' | 'center' | 'right';
export type TextGradientSwatchId =
  | 'gold-orange'
  | 'bone-white'
  | 'brimstone-red'
  | 'soul-blue';

export interface TextFontOption {
  id: TextFontFamilyId;
  label: string;
  cssFamily: string;
}

export interface TextGradientSwatch {
  id: TextGradientSwatchId;
  label: string;
  topColor: string;
  midColor: string;
  bottomColor: string;
}

export const TEXT_FONT_OPTIONS: TextFontOption[] = [
  {
    id: 'upheaval',
    label: 'Upheaval TT',
    cssFamily: '"Upheaval TT", "Space Grotesk", Impact, sans-serif',
  },
  {
    id: 'team-meat',
    label: 'Team Meat',
    cssFamily: '"Team Meat", "Space Grotesk", Impact, sans-serif',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk / Impact',
    cssFamily: '"Space Grotesk", Impact, "Arial Black", sans-serif',
  },
];

export const TEXT_GRADIENT_SWATCHES: Record<TextGradientSwatchId, TextGradientSwatch> = {
  'gold-orange': {
    id: 'gold-orange',
    label: 'Gold-to-Orange',
    topColor: '#FFF089',
    midColor: '#FFB800',
    bottomColor: '#FF7A00',
  },
  'bone-white': {
    id: 'bone-white',
    label: 'Bone White',
    topColor: '#FFFFFF',
    midColor: '#F4EFEA',
    bottomColor: '#C6B8A8',
  },
  'brimstone-red': {
    id: 'brimstone-red',
    label: 'Brimstone Red',
    topColor: '#FF8585',
    midColor: '#E03E3E',
    bottomColor: '#8F1515',
  },
  'soul-blue': {
    id: 'soul-blue',
    label: 'Soul Blue',
    topColor: '#B8E8FF',
    midColor: '#5CA8E6',
    bottomColor: '#255C99',
  },
};

export interface TextLayerNode {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: TextFontFamilyId;
  fontSize: number;
  rotationDeg: number;
  align: TextAlignMode;
  swatch: TextGradientSwatchId;
  strokeWidth: number;
  dropShadow: number;
  inkBanner: boolean;
}

export interface SceneState {
  projectName: string;
  presetName: string;
  stageId: string;
  camera: CameraConfig;
  backdrop: BackdropFilterConfig;
  editorOverlays: EditorOverlayConfig;
  formationPreset: FormationPreset;
  pedestalScale: number;
  character: {
    id: string;
    name: string;
    pose: CharacterPoseId;
    edenHairId?: number;
    scale: number;
    x: number;
    y: number;
    rotationDeg?: number;
  };
  pedestals: PedestalSlotNode[];
  textLayers: TextLayerNode[];
}

export interface ResolvedSceneNode {
  id: string;
  kind: 'character' | 'pedestal' | 'text';
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
  zIndex: number;
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  zoom: 2.1,
  panX: 0,
  panY: -18,
};

export const DEFAULT_BACKDROP_FILTERS: BackdropFilterConfig = {
  vignetteIntensity: 65,
  backdropDimming: 25,
  depthBlur: 1.5,
};

export const DEFAULT_CHARACTER_SCALE = 1.85;
export const DEFAULT_PEDESTAL_SCALE = 1.5;
export const DEFAULT_CHARACTER_POSITION: Vec2 = { x: 280, y: 505 };

export const STARTER_PEDESTAL_POOL: PedestalSlotNode[] = [
  {
    id: 'pedestal-1',
    itemId: 182,
    itemName: 'Sacred Heart',
    quality: 4,
    altarStyle: 'gold',
    priceTag: 'none',
    highlightFx: 'q4-glow',
  },
  {
    id: 'pedestal-2',
    itemId: 118,
    itemName: 'Brimstone',
    quality: 4,
    altarStyle: 'devil',
    priceTag: '2-hearts',
    highlightFx: 'outline',
  },
  {
    id: 'pedestal-3',
    itemId: 562,
    itemName: 'Rock Bottom',
    quality: 3,
    altarStyle: 'stone',
    priceTag: 'none',
    highlightFx: 'none',
  },
  {
    id: 'pedestal-4',
    itemId: 0,
    itemName: 'Curse of the Blind',
    quality: 4,
    altarStyle: 'stone',
    priceTag: 'blind',
    highlightFx: 'none',
  },
  {
    id: 'pedestal-5',
    itemId: 331,
    itemName: 'Godhead',
    quality: 4,
    altarStyle: 'angel',
    priceTag: 'none',
    highlightFx: 'q4-glow',
  },
  {
    id: 'pedestal-6',
    itemId: 689,
    itemName: 'Glitched Crown',
    quality: 4,
    altarStyle: 'devil',
    priceTag: 'none',
    highlightFx: 'q4-glow',
  },
];

export function createDefaultSceneState(): SceneState {
  return {
    projectName: 'Eden Run - Burning Basement',
    presetName: 'Eden Run Default',
    stageId: 'burning-basement',
    camera: { ...DEFAULT_CAMERA_CONFIG },
    backdrop: { ...DEFAULT_BACKDROP_FILTERS },
    editorOverlays: {
      showSafeZoneOverlay: true,
      showSnapGrid: false,
    },
    formationPreset: 'arc',
    pedestalScale: DEFAULT_PEDESTAL_SCALE,
    character: {
      id: 'eden',
      name: '09. Eden',
      pose: 'pickup',
      edenHairId: 12,
      scale: DEFAULT_CHARACTER_SCALE,
      x: DEFAULT_CHARACTER_POSITION.x,
      y: DEFAULT_CHARACTER_POSITION.y,
    },
    pedestals: STARTER_PEDESTAL_POOL.slice(0, 4).map((slot) => ({ ...slot })),
    textLayers: [
      {
        id: 'text-headline',
        text: 'GOD TIER EDEN START?!',
        x: 640,
        y: 96,
        fontFamily: 'upheaval',
        fontSize: 64,
        rotationDeg: 0,
        align: 'center',
        swatch: 'gold-orange',
        strokeWidth: 6,
        dropShadow: 6,
        inkBanner: true,
      },
    ],
  };
}
