export interface CalculationState {
  powerInWatts: number;
  voltage: number; // 230 or 400
  phases: 1 | 3;
  protectionCurrent: number; // In
  protectionType: 'smeltpatroon' | 'automaat';
  protectionCharacteristic: 'B' | 'C' | 'D' | 'gG' | 'gL' | 'gF';
  installationMethod: string;
  insulationType: 'PVC' | 'XLPE';
  ambientTemperature: number;
  numberOfGroupedCables: number;
  cableLength: number;
  earthingSystem: 'TN' | 'TT';
  hasRCD: boolean;
  earthResistance?: number;
  existingSection?: string;
  numberOfCores?: string;
}

export interface Result {
  operatingCurrent: number; // IB
  minRequiredCapacity: number; // IZ
  selectedCrossSection: number;
  correctionFactorTemp: number;
  correctionFactorGrouping: number;
  totalCorrectionFactor: number;
  voltageDrop: number;
  isLimitedByVoltageDrop: boolean;
  maxShortCircuitLength?: number;
  isShortCircuitExceeded: boolean;
  isOverloaded: boolean;
  isInsufficientCapacity: boolean;
  references?: {
    operatingCurrent: string;
    protection: string;
    iz: string;
    kTemp: string;
    kGroup: string;
    capacity: string;
    voltageDrop: string;
    shortCircuit: string;
  };
}
