// Current-carrying capacity (Table 52.B.2 & 52.B.4 - Simplified for PVC/Copper/2-3 loaded conductors)
// Values are in Amperes.
// Keys: cross-section in mm2
// Values: [2 cores loaded, 3 cores loaded]
export const CAPACITY_TABLE_PVC_C: Record<number, [number, number]> = {
  1.5: [14.5, 13.5], // Method A1/A2
  2.5: [19.5, 18],
  4: [26, 24],
  6: [34, 31],
  10: [46, 42],
  16: [61, 56],
  25: [80, 73],
  35: [99, 89],
  50: [119, 108],
  70: [151, 136],
  95: [182, 164],
  120: [210, 188],
};

// Method C (on wall)
export const CAPACITY_TABLE_PVC_WALL: Record<number, [number, number]> = {
  1.5: [19.5, 17.5],
  2.5: [27, 24],
  4: [36, 32],
  6: [46, 41],
  10: [63, 57],
  16: [85, 76],
  25: [112, 101],
  35: [138, 125],
  50: [168, 151],
  70: [213, 192],
  95: [258, 232],
  120: [299, 269],
};

// Method E/F (in air / trays / ladders)
export const CAPACITY_TABLE_PVC_AIR: Record<number, [number, number]> = {
  1.5: [22, 18.5],
  2.5: [30, 25],
  4: [40, 34],
  6: [51, 43],
  10: [70, 60],
  16: [94, 80],
  25: [119, 101],
  35: [148, 126],
  50: [180, 153],
  70: [232, 196],
  95: [282, 238],
  120: [328, 276],
};

// XLPE / EPR (90C) - Table 52.B.3 (Simplified)
export const CAPACITY_TABLE_XLPE_C: Record<number, [number, number]> = {
  1.5: [17, 15.5], 
  2.5: [23, 21],
  4: [31, 28],
  6: [40, 36],
  10: [54, 49],
  16: [73, 66],
  25: [95, 86],
  35: [117, 105],
  50: [141, 128],
  70: [179, 161],
  95: [216, 194],
  120: [249, 224],
};

export const CAPACITY_TABLE_XLPE_WALL: Record<number, [number, number]> = {
  1.5: [23, 21],
  2.5: [31, 28],
  4: [42, 38],
  6: [54, 49],
  10: [75, 68],
  16: [100, 91],
  25: [133, 121],
  35: [164, 150],
  50: [197, 181],
  70: [253, 230],
  95: [306, 278],
  120: [354, 322],
};

export const CAPACITY_TABLE_XLPE_AIR: Record<number, [number, number]> = {
  1.5: [26, 22],
  2.5: [36, 30],
  4: [48, 40],
  6: [62, 52],
  10: [85, 71],
  16: [113, 94],
  25: [144, 121],
  35: [178, 150],
  50: [216, 182],
  70: [278, 233],
  95: [338, 284],
  120: [393, 330],
};

// Correction factors for ambient temperature (Table 52.B.14 for PVC, 52.B.15 for XLPE)
export const TEMP_CORRECTION: Record<string, Record<number, number>> = {
  PVC: {
    10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1.00,
    35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61,
  },
  XLPE: {
    10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1.00,
    35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71,
  }
};

// Correction factors for grouping (Table 52.B.17 - Number of cables/circuits)
// Standard bundling (Conduit, trunking, on wall)
export const GROUPING_STANDARD: Record<number, number> = {
  1: 1.00,
  2: 0.80,
  3: 0.70,
  4: 0.65,
  5: 0.60,
  6: 0.57,
  7: 0.54,
  8: 0.52,
  9: 0.50,
};

// Table 52.B.20: Single layer on perforated horizontal trays
export const GROUPING_TRAY_PERF: Record<number, number> = {
  1: 1.00,
  2: 0.88,
  3: 0.82,
  4: 0.77,
  5: 0.75,
  6: 0.73,
  7: 0.73,
  8: 0.72,
  9: 0.72,
};

// Table 52.B.21: Single layer on ladders, brackets, cleats
export const GROUPING_LADDER: Record<number, number> = {
  1: 1.00,
  2: 0.87,
  3: 0.82,
  4: 0.80,
  5: 0.80,
  6: 0.79,
  7: 0.79,
  8: 0.78,
  9: 0.78,
};

export const INSTALLATION_METHODS = [
  { id: 'A1', label: 'A1: Geïsoleerd in buis in een thermisch isolerende wand', base: 'A', groupingTable: 'standard' },
  { id: 'A2', label: 'A2: Meeraderige kabel in buis in een thermisch isolerende wand', base: 'A', groupingTable: 'standard' },
  { id: 'B1', label: 'B1: Geïsoleerd in buis op een houten wand', base: 'B', groupingTable: 'standard' },
  { id: 'B2', label: 'B2: Meeraderige kabel in buis op een houten wand', base: 'B', groupingTable: 'standard' },
  { id: 'C', label: 'C: Meeraderige kabel op een houten wand', base: 'C', groupingTable: 'standard' },
  { id: 'E', label: 'E: Meeraderige kabel in de vrije lucht', base: 'E', groupingTable: 'standard' },
  { id: 'Tray_Perf', label: 'Perforeerde kabelgoot (horizontaal)', base: 'E', groupingTable: 'tray_perf' },
  { id: 'Tray_Unperf', label: 'Ongeperforeerde kabelgoot', base: 'C', groupingTable: 'standard' },
  { id: 'Ladder', label: 'Kabelladder of beugels', base: 'E', groupingTable: 'ladder' },
];

export const VOLTAGES = [
  { label: '230V (1-fase)', value: 230, phases: 1 },
  { label: '400V (3-fase)', value: 400, phases: 3 },
];

export const PROTECTION_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

export const PROTECTION_CHARACTERISTICS = ['B', 'C', 'D'];
export const FUSE_CHARACTERISTICS = ['gG', 'gL', 'gF'];

// NEN 1010:2020 Table 53.F.1 (B), 53.F.2 (C), 53.F.3 (gG)
// Max lengths in meters for 230V, TN-stelsel, PVC
// Keys: Protection Rating In
// Values: Record<CrossSection, Length>
export const SHORT_CIRCUIT_TABLES: Record<string, Record<number, Record<number, number>>> = {
  B: {
    6: { 1.5: 198, 2.5: 324, 4: 522, 6: 780 },
    10: { 1.5: 118, 2.5: 194, 4: 312, 6: 468, 10: 780 },
    16: { 1.5: 74, 2.5: 122, 4: 196, 6: 294, 10: 490, 16: 785 },
    20: { 1.5: 59, 2.5: 97, 4: 156, 6: 234, 10: 390, 16: 625 },
    25: { 2.5: 78, 4: 125, 6: 187, 10: 312, 16: 501, 25: 781 },
    32: { 4: 98, 6: 147, 10: 245, 16: 392, 25: 613 },
    40: { 6: 118, 10: 196, 16: 314, 25: 490 },
    50: { 10: 157, 16: 251, 25: 392 },
    63: { 10: 124, 16: 199, 25: 311 },
  },
  C: {
    6: { 1.5: 99, 2.5: 162, 4: 261, 6: 390 },
    10: { 1.5: 59, 2.5: 97, 4: 156, 6: 234, 10: 390 },
    16: { 1.5: 37, 2.5: 61, 4: 98, 6: 146, 10: 245, 16: 392 },
    20: { 1.5: 29, 2.5: 48, 4: 78, 6: 117, 10: 196, 16: 314 },
    25: { 2.5: 39, 4: 62, 6: 94, 10: 156, 16: 250, 25: 391 },
    32: { 4: 49, 6: 73, 10: 122, 16: 196, 25: 306 },
    40: { 6: 59, 10: 98, 16: 157, 25: 245 },
    50: { 10: 78, 16: 125, 25: 196 },
    63: { 10: 62, 16: 100, 25: 155 },
  },
  D: {
    6: { 1.5: 49, 2.5: 81, 4: 130, 6: 195 },
    10: { 1.5: 29, 2.5: 48, 4: 78, 6: 117, 10: 195 },
    16: { 1.5: 18, 2.5: 30, 4: 49, 6: 73, 10: 122, 16: 196 },
    20: { 1.5: 14, 2.5: 24, 4: 39, 6: 58, 10: 98, 16: 157 },
    25: { 2.5: 19, 4: 31, 6: 47, 10: 78, 16: 125, 25: 195 },
    32: { 4: 24, 6: 36, 10: 61, 16: 98, 25: 153 },
    40: { 6: 29, 10: 49, 16: 78, 25: 122 },
    50: { 10: 39, 16: 62, 25: 98 },
    63: { 10: 31, 16: 50, 25: 77 },
  },
  gG: {
    6: { 1.5: 441, 2.5: 735, 4: 1176 },
    10: { 1.5: 209, 2.5: 348, 4: 558, 6: 836 },
    16: { 1.5: 110, 2.5: 183, 4: 294, 6: 441, 10: 735 },
    20: { 1.5: 76, 2.5: 126, 4: 202, 6: 304, 10: 506 },
    25: { 2.5: 95, 4: 152, 6: 228, 10: 380, 16: 608 },
    32: { 4: 106, 6: 159, 10: 265, 16: 424, 25: 663 },
    40: { 6: 113, 10: 188, 16: 301, 25: 471 },
    50: { 10: 136, 16: 218, 25: 341 },
    63: { 16: 160, 25: 250 },
  },
  gL: {
    6: { 1.5: 441, 2.5: 735, 4: 1176 },
    10: { 1.5: 209, 2.5: 348, 4: 558, 6: 836 },
    16: { 1.5: 110, 2.5: 183, 4: 294, 6: 441, 10: 735 },
    20: { 1.5: 76, 2.5: 126, 4: 202, 6: 304, 10: 506 },
    25: { 2.5: 95, 4: 152, 6: 228, 10: 380, 16: 608 },
    32: { 4: 106, 6: 159, 10: 265, 16: 424, 25: 663 },
    40: { 6: 113, 10: 188, 16: 301, 25: 471 },
    50: { 10: 136, 16: 218, 25: 341 },
    63: { 16: 160, 25: 250 },
  },
  gF: {
    6: { 1.5: 350, 2.5: 580, 4: 930 },
    10: { 1.5: 160, 2.5: 260, 4: 420 },
    16: { 1.5: 80, 2.5: 130, 4: 210 },
    20: { 1.5: 55, 2.5: 90, 4: 140 },
    25: { 2.5: 65, 4: 100 },
    32: { 4: 70, 10: 180 },
    40: { 6: 75, 10: 125 },
    50: { 10: 90, 16: 145 },
    63: { 16: 110, 25: 170 },
  }
};

export const EARTHING_SYSTEMS = [
  { id: 'TN', label: 'TN-stelsel (TN-S / TN-C)' },
  { id: 'TT', label: 'TT-stelsel' },
];
