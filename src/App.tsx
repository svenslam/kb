/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Shield, 
  Settings, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Info,
  Scale,
  Gauge,
  Thermometer,
  Layers,
  Calculator as CalcIcon,
  ChevronRight,
  Printer,
  X,
  FileText,
  User,
  Building2,
  MapPin,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CalculationState, Result } from './types';
import { 
  CAPACITY_TABLE_PVC_C, 
  CAPACITY_TABLE_PVC_WALL,
  CAPACITY_TABLE_PVC_AIR,
  CAPACITY_TABLE_XLPE_C,
  CAPACITY_TABLE_XLPE_WALL,
  CAPACITY_TABLE_XLPE_AIR,
  TEMP_CORRECTION, 
  GROUPING_STANDARD,
  GROUPING_TRAY_PERF,
  GROUPING_LADDER,
  INSTALLATION_METHODS, 
  VOLTAGES, 
  PROTECTION_RATINGS,
  PROTECTION_CHARACTERISTICS,
  FUSE_CHARACTERISTICS,
  SHORT_CIRCUIT_TABLES,
  EARTHING_SYSTEMS
} from './constants';

const STEPS = [
  { id: 'load', title: 'Belasting', icon: Zap },
  { id: 'protection', title: 'Beveiliging', icon: Shield },
  { id: 'installation', title: 'Installatie', icon: Settings },
  { id: 'result', title: 'Resultaat', icon: CheckCircle2 },
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [projectRef, setProjectRef] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<CalculationState>({
    powerInWatts: 3680,
    voltage: 230,
    phases: 1,
    protectionCurrent: 16,
    protectionType: 'automaat',
    protectionCharacteristic: 'B',
    installationMethod: 'A1',
    insulationType: 'PVC',
    ambientTemperature: 20,
    numberOfGroupedCables: 1,
    cableLength: 20,
    earthingSystem: 'TN',
    hasRCD: true,
    earthResistance: 1.5
  });

  const [expandedSummary, setExpandedSummary] = useState({
    calculations: false,
    references: false
  });

  const handleRestart = () => {
    setCurrentStep(0);
    setCustomerName('');
    setProjectRef('');
    setExpandedSummary({
      calculations: false,
      references: false
    });
    setState({
      powerInWatts: 3680,
      voltage: 230,
      phases: 1,
      protectionCurrent: 16,
      protectionType: 'automaat',
      protectionCharacteristic: 'B',
      installationMethod: 'A1',
      insulationType: 'PVC',
      ambientTemperature: 20,
      numberOfGroupedCables: 1,
      cableLength: 20,
      earthingSystem: 'TN',
      hasRCD: true,
      earthResistance: 1.5
    });
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const results = useMemo((): Result => {
    const factor = state.phases === 1 ? 1 : Math.sqrt(3);
    const IB = state.powerInWatts / (state.voltage * factor);
    const In = state.protectionCurrent;
    const IZ = state.protectionType === 'smeltpatroon' ? 1.1 * In : In;
    
    // Select correct grouping factor table based on method
    const method = INSTALLATION_METHODS.find(m => m.id === state.installationMethod);
    let groupingTable = GROUPING_STANDARD;
    if (method?.groupingTable === 'tray_perf') groupingTable = GROUPING_TRAY_PERF;
    if (method?.groupingTable === 'ladder') groupingTable = GROUPING_LADDER;

    const kTemp = TEMP_CORRECTION[state.insulationType][state.ambientTemperature] || 1.0;
    const kGroup = groupingTable[state.numberOfGroupedCables] || 1.0;
    const totalCorrection = kTemp * kGroup;
    const reqItab = IZ / totalCorrection;

    // Select correct capacity table based on base reference method and insulation
    let table = CAPACITY_TABLE_PVC_C; // Default
    
    if (state.insulationType === 'PVC') {
      table = CAPACITY_TABLE_PVC_C;
      if (method?.base === 'C') table = CAPACITY_TABLE_PVC_WALL;
      if (method?.base === 'E' || method?.base === 'F') table = CAPACITY_TABLE_PVC_AIR;
    } else {
      table = CAPACITY_TABLE_XLPE_C;
      if (method?.base === 'C') table = CAPACITY_TABLE_XLPE_WALL;
      if (method?.base === 'E' || method?.base === 'F') table = CAPACITY_TABLE_XLPE_AIR;
    }

    const phaseIdx = state.phases === 1 ? 0 : 1;
    const sortedSections = Object.keys(table).map(Number).sort((a, b) => a - b);
    
    // Select minimal section that satisfies BOTH Current Capacity AND Voltage Drop (<5%)
    let selectedSection = sortedSections[sortedSections.length - 1];
    let currentOnlySection = selectedSection;
    const rho = 0.0175;
    const dropFactor = state.phases === 1 ? 2 : Math.sqrt(3);

    // First find section based only on current
    for (const section of sortedSections) {
      if (table[section][phaseIdx] >= reqItab) {
        currentOnlySection = section;
        break;
      }
    }

    // Then find section based on both
    for (const section of sortedSections) {
      const capacity = table[section][phaseIdx];
      const vDrop = (dropFactor * state.cableLength * IB * rho) / section;
      const vDropPerc = vDrop / state.voltage;

      if (capacity >= reqItab && vDropPerc <= 0.05) {
        selectedSection = section;
        break;
      }
    }

    const voltageDrop = (dropFactor * state.cableLength * IB * rho) / selectedSection;

    // Short circuit max length (Table 53.F) / Fault protection (TT)
    let maxSC = undefined;
    let isExceeded = false;
    const charTable = SHORT_CIRCUIT_TABLES[state.protectionCharacteristic];

    if (state.earthingSystem === 'TN') {
      if (charTable && charTable[In]) {
        const lengths = charTable[In];
        const sectionKeys = Object.keys(lengths).map(Number).sort((a,b) => b-a);
        for(const sk of sectionKeys) {
            if(selectedSection >= sk) {
                maxSC = lengths[sk];
                break;
            }
        }
      }
      isExceeded = maxSC !== undefined && state.cableLength > maxSC;
    } else {
      // TT System
      if (state.hasRCD) {
        maxSC = undefined; // RCD handles it
        isExceeded = false;
      } else if (state.earthResistance !== undefined) {
        // Automatic calculation for TT without RCD (NEN 1010:2020 411.3.2.2 - Table 41.1: 0.2s)
        // Condition: Zs * Ia <= Uo (230V)
        // Magnetic trip is < 0.1s, so factors B:5, C:10, D:20 remain valid for 0.2s
        // For fuses (gG), Ia must be higher for 0.2s than for 0.4s.
        let Ia = In * 13; // Stricter factor for gG fuses at 0.2s (approx 12-14x In)
        if (state.protectionCharacteristic === 'B') Ia = In * 5;
        if (state.protectionCharacteristic === 'C') Ia = In * 10;
        if (state.protectionCharacteristic === 'D') Ia = In * 20;
        
        const MaxZs = 230 / Ia;
        const Ra = state.earthResistance;
        
        if (Ra >= MaxZs) {
          maxSC = 0; // Impossible even with 0m cable
          isExceeded = true;
        } else {
          // MaxRcable = MaxZs - Ra
          // Rcable = (rho * L * factor) / S
          // L = (MaxZs - Ra) * S / (rho * factor)
          // We use factor 2 for phase-pe loop
          const MaxRcable = MaxZs - Ra;
          const rhoFault = rho * 1.5; // Correction for temp during fault
          maxSC = Math.floor((MaxRcable * selectedSection) / (rhoFault * 2));
          isExceeded = state.cableLength > maxSC;
        }
      }
    }

    return {
      operatingCurrent: IB,
      minRequiredCapacity: IZ,
      selectedCrossSection: selectedSection,
      correctionFactorTemp: kTemp,
      correctionFactorGrouping: kGroup,
      totalCorrectionFactor: totalCorrection,
      voltageDrop: voltageDrop,
      isLimitedByVoltageDrop: selectedSection > currentOnlySection,
      maxShortCircuitLength: maxSC,
      isShortCircuitExceeded: isExceeded,
      isOverloaded: IB > state.protectionCurrent,
      references: {
        operatingCurrent: 'NEN 1010:2020 311',
        protection: 'NEN 1010:2020 433.1',
        iz: 'NEN 1010:2020 433.1.1',
        kTemp: state.insulationType === 'PVC' ? 'NEN 1010:2020 Tabel 52.B.14' : 'NEN 1010:2020 Tabel 52.B.15',
        kGroup: method?.groupingTable === 'tray_perf' ? 'Tabel 52.B.20' : method?.groupingTable === 'ladder' ? 'Tabel 52.B.21' : 'Tabel 52.B.17',
        capacity: state.insulationType === 'PVC' ? (method?.base === 'A' || method?.base === 'B' ? 'Tabel 52.B.2' : 'Tabel 52.B.4') : (method?.base === 'A' || method?.base === 'B' ? 'Tabel 52.B.3' : 'Tabel 52.B.5'),
        voltageDrop: 'NEN 1010:2020 525',
        shortCircuit: state.earthingSystem === 'TN' 
          ? (state.protectionCharacteristic === 'B' ? 'Tabel 53.F.1' : state.protectionCharacteristic === 'C' ? 'Tabel 53.F.2' : 'Tabel 53.F.3')
          : (state.hasRCD ? 'NEN 1010:2020 411.5.3' : 'NEN 1010:2020 Tabel 41.1 (0.2s)')
      }
    };
  }, [state]);

  const updateState = (updates: Partial<CalculationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main font-sans flex flex-col print:bg-white print:text-black">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border bg-bg-panel flex justify-between items-center shadow-lg print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white shadow-xl shadow-accent/20">
            <CalcIcon size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">KabelBerekenaar <span className="text-text-dim font-normal ml-2">NEN 1010:2020</span></h1>
        </div>
        <div className="flex gap-4">
          <span className="text-[10px] font-bold bg-accent-dim text-accent px-3 py-1 rounded border border-accent uppercase tracking-wider">
            Facta Elektrotechniek
          </span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] divide-x divide-border print:block">
        
        {/* Left Column: Context & Progress */}
        <aside className="bg-bg-main p-8 hidden lg:flex flex-col gap-8 print:hidden">
          <div>
            <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layers size={14} className="text-accent" />
              Status
            </h2>
            <div className="space-y-4">
              {STEPS.map((step, idx) => (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-4 transition-all ${idx === currentStep ? 'opacity-100' : 'opacity-40'}`}
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs ${
                    idx === currentStep ? 'border-accent bg-accent text-white shadow-lg shadow-accent/30' : 'border-border bg-bg-panel'
                  }`}>
                    {idx < currentStep ? <CheckCircle2 size={14} /> : idx + 1}
                  </div>
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="p-4 bg-bg-panel rounded-xl border border-border">
              <h3 className="text-xs text-text-dim mb-3 uppercase tracking-wider">Huidige Bedrijfsstroom</h3>
              <div className="text-3xl font-mono text-accent">
                {results.operatingCurrent.toFixed(2)}<span className="text-sm ml-1 opacity-50">A</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Active Controls */}
        <section className="bg-bg-panel/50 p-4 sm:p-8 flex flex-col print:hidden overflow-y-auto">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8 max-w-2xl mx-auto"
                >
                  <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-accent" />
                    1. Belasting & Fase
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3 bg-bg-input p-1 rounded-xl border border-border">
                    {VOLTAGES.map((v) => (
                      <button
                        key={v.value}
                        onClick={() => updateState({ voltage: v.value, phases: v.phases as 1|3 })}
                        className={`py-3 rounded-lg text-sm font-medium transition-all ${
                          state.voltage === v.value 
                            ? 'bg-accent text-white shadow-xl shadow-accent/20' 
                            : 'hover:bg-white/5 text-text-dim hover:text-text-main'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-main">Vermogen (P)</label>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateState({ powerInWatts: Math.max(0, state.powerInWatts - 100) })}
                        className="w-14 h-14 bg-bg-input border border-border rounded-xl flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/40 shadow-sm transition-all active:scale-95"
                      >
                        <Minus size={20} />
                      </button>
                      <div className="relative group flex-1">
                        <input
                          type="number"
                          value={state.powerInWatts === 0 ? '' : state.powerInWatts}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value;
                            updateState({ powerInWatts: val === '' ? 0 : Number(val) });
                          }}
                          className="w-full text-5xl font-bold tracking-tight bg-bg-input border border-border rounded-xl px-6 py-8 focus:border-accent outline-none transition-all text-white placeholder:opacity-20"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl text-text-dim font-bold">W</span>
                      </div>
                      <button 
                        onClick={() => updateState({ powerInWatts: state.powerInWatts + 100 })}
                        className="w-14 h-14 bg-bg-input border border-border rounded-xl flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/40 shadow-sm transition-all active:scale-95"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8 max-w-2xl mx-auto"
                >
                  <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} className="text-accent" />
                    2. Beveiliging
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => updateState({ protectionType: 'automaat', protectionCharacteristic: 'B' })}
                      className={`p-6 rounded-xl border transition-all flex flex-col gap-2 ${
                        state.protectionType === 'automaat' 
                          ? 'border-accent bg-accent-dim shadow-xl' 
                          : 'border-border bg-bg-input hover:border-text-dim'
                      }`}
                    >
                      <div className="font-bold">Installatieautomaat</div>
                      <div className="text-xs opacity-60 italic">I₂ = 1,45 × I<sub>n</sub></div>
                    </button>
                    <button
                      onClick={() => updateState({ protectionType: 'smeltpatroon', protectionCharacteristic: 'gG' })}
                      className={`p-6 rounded-xl border transition-all flex flex-col gap-2 ${
                        state.protectionType === 'smeltpatroon' 
                          ? 'border-accent bg-accent-dim shadow-xl' 
                          : 'border-border bg-bg-input hover:border-text-dim'
                      }`}
                    >
                      <div className="font-bold">Smeltveiligheid</div>
                      <div className="text-xs opacity-60 italic">I₂ = 1,60 × I<sub>n</sub></div>
                    </button>
                  </div>

                    <div className="space-y-4">
                    <label className="text-sm font-medium text-text-main flex justify-between items-center">
                      Nominale Stroom (I<sub>n</sub>)
                      <span className="text-xs text-accent font-mono bg-accent-dim px-2 py-1 rounded">Min. {results.operatingCurrent.toFixed(1)}A vereist</span>
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {PROTECTION_RATINGS.map((rating) => (
                        <button
                          key={rating}
                          onClick={() => updateState({ protectionCurrent: rating })}
                          className={`py-3 rounded-lg border text-sm font-bold transition-all ${
                            state.protectionCurrent === rating 
                              ? 'border-accent bg-accent text-white shadow-xl shadow-accent/20' 
                              : rating < results.operatingCurrent 
                                ? 'border-border bg-bg-input text-text-dim opacity-40 line-through'
                                : 'border-border bg-bg-input hover:border-accent text-text-main font-mono'
                          }`}
                        >
                          {rating}A
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 bg-bg-panel/40 p-6 rounded-xl border border-border"
                  >
                    <label className="text-sm font-medium text-text-main flex items-center gap-2">
                      <Gauge size={16} className="text-accent" />
                      {state.protectionType === 'automaat' ? 'Uitschakel-karakteristiek' : 'Type Smeltzekering'}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(state.protectionType === 'automaat' ? PROTECTION_CHARACTERISTICS : FUSE_CHARACTERISTICS).map((char) => (
                        <button
                          key={char}
                          onClick={() => updateState({ protectionCharacteristic: char as any })}
                          className={`py-3 rounded-lg border text-sm font-bold transition-all ${
                            state.protectionCharacteristic === char 
                              ? 'border-accent bg-accent text-white shadow-lg' 
                              : 'border-border bg-bg-input hover:border-accent text-text-main'
                          }`}
                        >
                          {char}{state.protectionType === 'automaat' ? '-Kar.' : ''}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-dim italic">
                      * Bepalend voor de maximale kabellengte bij kortsluiting (NEN 1010:2020 53.F).
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8 max-w-2xl mx-auto"
                >
                  <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
                    <Settings size={14} className="text-accent" />
                    3. Installatie & Omgeving
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-text-main">Type Stelsel (Aarding)</label>
                      <select
                        value={state.earthingSystem}
                        onChange={(e) => updateState({ earthingSystem: e.target.value as 'TN' | 'TT' })}
                        className="w-full p-4 rounded-xl border border-border bg-bg-input text-white text-sm outline-none focus:border-accent cursor-pointer"
                      >
                        {EARTHING_SYSTEMS.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-text-main">Aardlekbeveiliging</label>
                      <div className="flex bg-bg-input p-1 rounded-xl border border-border">
                        <button
                          onClick={() => updateState({ hasRCD: true })}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                            state.hasRCD 
                              ? 'bg-success text-white shadow-lg' 
                              : 'text-text-dim hover:text-text-main'
                          }`}
                        >
                          Aanwezig
                        </button>
                        <button
                          onClick={() => updateState({ hasRCD: false })}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                            !state.hasRCD 
                              ? 'bg-text-dim text-white shadow-lg' 
                              : 'text-text-dim hover:text-text-main'
                          }`}
                        >
                          Niet Aanwezig
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {state.earthingSystem === 'TT' && !state.hasRCD && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden bg-orange-500/5 p-4 rounded-xl border border-orange-500/20"
                      >
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                          <Scale size={14} className="text-warning" />
                          Aardverspreidingsweerstand (R<sub>a</sub>)
                        </label>
                        <div className="flex items-center gap-3">
                           <button 
                            onClick={() => updateState({ earthResistance: Math.max(0, (state.earthResistance || 0) - 0.5) })}
                            className="w-12 h-12 bg-bg-input border border-border rounded-xl flex items-center justify-center text-text-dim hover:text-accent transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step="0.1"
                              value={state.earthResistance}
                              onChange={(e) => updateState({ earthResistance: Number(e.target.value) })}
                              className="w-full p-4 rounded-xl border border-border bg-bg-input text-white text-xl font-mono outline-none focus:border-accent"
                              placeholder="Bijv. 1.5"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim font-bold">Ω</div>
                          </div>
                          <button 
                            onClick={() => updateState({ earthResistance: (state.earthResistance || 0) + 0.5 })}
                            className="w-12 h-12 bg-bg-input border border-border rounded-xl flex items-center justify-center text-text-dim hover:text-accent transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <p className="text-[10px] text-text-dim italic">
                          Zonder RCD moet de aardweerstand zeer laag zijn om de automaat tijdig te laten trippen.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-text-main">Installatiemethode</label>
                      <select
                        value={state.installationMethod}
                        onChange={(e) => updateState({ installationMethod: e.target.value })}
                        className="w-full p-4 rounded-xl border border-border bg-bg-input text-white text-sm outline-none focus:border-accent cursor-pointer"
                      >
                        {INSTALLATION_METHODS.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-text-main">Kabel Isolatie</label>
                      <div className="grid grid-cols-2 gap-3 bg-bg-input p-1 rounded-xl border border-border">
                        {(['PVC', 'XLPE'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => updateState({ insulationType: type })}
                            className={`py-3 rounded-lg text-sm font-medium transition-all ${
                              state.insulationType === type 
                                ? 'bg-accent text-white shadow-lg' 
                                : 'hover:bg-white/5 text-text-dim hover:text-text-main'
                            }`}
                          >
                            {type} {type === 'PVC' ? '(70°C)' : '(90°C)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-text-main flex items-center gap-2">
                        <Thermometer size={16} className="text-accent" />
                        Omgevingstemperatuur
                      </label>
                      <div className="p-4 bg-bg-input rounded-xl border border-border flex items-center gap-4">
                        <input
                          type="range"
                          min="10"
                          max="55"
                          step="5"
                          value={state.ambientTemperature}
                          onChange={(e) => updateState({ ambientTemperature: Number(e.target.value) })}
                          className="flex-1 accent-accent"
                        />
                        <span className="text-2xl font-mono text-accent w-16 text-right font-bold">{state.ambientTemperature}°C</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-text-main flex items-center gap-2">
                        <Layers size={16} className="text-accent" />
                        Aantal kabels bij elkaar (groepering)
                      </label>
                      <select
                        value={state.numberOfGroupedCables}
                        onChange={(e) => updateState({ numberOfGroupedCables: Number(e.target.value) })}
                        className="w-full p-4 rounded-xl border border-border bg-bg-input text-white text-sm outline-none focus:border-accent"
                      >
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                          <option key={n} value={n}>{n} Kabel{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-main">Kabellengte</label>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateState({ cableLength: Math.max(1, state.cableLength - 1) })}
                        className="w-14 h-14 bg-bg-input border border-border rounded-xl flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/40 shadow-sm transition-all active:scale-95"
                      >
                        <Minus size={20} />
                      </button>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={state.cableLength === 0 ? '' : state.cableLength}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value;
                            updateState({ cableLength: val === '' ? 0 : Number(val) });
                          }}
                          className="w-full text-4xl font-bold bg-bg-input border border-border rounded-xl px-6 py-6 focus:border-accent outline-none text-white font-mono placeholder:opacity-20"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg text-text-dim font-bold">meter</span>
                      </div>
                      <button 
                        onClick={() => updateState({ cableLength: state.cableLength + 1 })}
                        className="w-14 h-14 bg-bg-input border border-border rounded-xl flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/40 shadow-sm transition-all active:scale-95"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8 max-w-2xl mx-auto"
                >
                  <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2 px-2">
                    <CheckCircle2 size={14} className="text-accent" />
                    4. Resultaat & Validatie
                  </h2>

                  <div className="bg-bg-panel border-2 border-dashed border-accent/40 rounded-3xl p-12 text-center shadow-2xl shadow-accent/5 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-4">Aanbevolen Doorsnede</div>
                      <div className="text-8xl font-black text-accent tracking-tighter flex items-center justify-center gap-2">
                        {results.selectedCrossSection}
                        <span className="text-2xl font-light text-text-dim">mm²</span>
                      </div>
                      {results.isOverloaded && (
                        <div className="mt-2 text-[10px] bg-error/20 text-error px-3 py-1 rounded-full border border-error/30 inline-block font-bold">
                          WAARSCHUWING: Bedrijfsstroom hoger dan beveiliging!
                        </div>
                      )}
                      {results.isLimitedByVoltageDrop && (
                        <div className="mt-2 text-[10px] bg-warning/20 text-warning px-3 py-1 rounded-full border border-warning/30 inline-block font-bold">
                          Verhoogd i.v.m. spanningsverlies ({'>'}5%)
                        </div>
                      )}
                      {results.isShortCircuitExceeded && (
                        <div className="mt-2 text-[10px] bg-error/20 text-error px-3 py-1 rounded-full border border-error/30 inline-block font-bold mx-1">
                          AFGEKEURD: Kabellengte te lang
                        </div>
                      )}
                      <div className="mt-8 flex justify-center gap-3">
                        <span className="px-4 py-2 bg-bg-input border border-border rounded-full text-xs font-bold text-text-main shadow-lg">Koper (Cu)</span>
                        <span className="px-4 py-2 bg-bg-input border border-border rounded-full text-xs font-bold text-text-main shadow-lg">PVC / XLPE</span>
                      </div>
                    </div>
                    {/* Ethereal Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-bg-input border border-border rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-bg-panel border border-border rounded-full flex items-center justify-center text-accent">
                        <Gauge size={20} />
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Spanningsverlies</div>
                        <div className={`text-xl font-mono font-bold ${results.voltageDrop > state.voltage * 0.05 ? 'text-warning' : 'text-text-main'}`}>
                          {results.voltageDrop.toFixed(2)}V ({( (results.voltageDrop / state.voltage) * 100).toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-bg-input border border-border rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-bg-panel border border-border rounded-full flex items-center justify-center text-accent">
                        <Scale size={20} />
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Correctiefactor</div>
                        <div className="text-xl font-mono font-bold text-text-main">
                          x {(results.totalCorrectionFactor).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    {results.maxShortCircuitLength && (
                      <div className={`p-6 bg-bg-input border rounded-2xl flex items-center gap-4 ${results.isShortCircuitExceeded ? 'border-error/40 bg-error/5' : 'border-border'}`}>
                        <div className={`w-12 h-12 bg-bg-panel border border-border rounded-full flex items-center justify-center ${results.isShortCircuitExceeded ? 'text-error' : 'text-accent'}`}>
                          <Shield size={20} />
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Max. Lengte (KS)</div>
                          <div className={`text-xl font-mono font-bold ${results.isShortCircuitExceeded ? 'text-error' : 'text-text-main'}`}>
                            {results.maxShortCircuitLength}m
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-4 bg-accent/5 rounded-2xl border border-accent/10"
                >
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-4">Specificaties NEN 1010:2020</h3>
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-text-dim">Bedrijfsstroom</span><span className="font-mono text-accent">{results.references?.operatingCurrent}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-text-dim">Isolatie</span><span className="font-mono text-accent">{state.insulationType}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-text-dim">Beveiliging</span><span className="font-mono text-accent">{results.references?.protection}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-text-dim">Stroomketen</span><span className="font-mono text-accent">{results.references?.iz}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-text-dim">Temp-factor</span><span className="font-mono text-accent">{results.references?.kTemp}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-text-dim">Groep-factor</span><span className="font-mono text-accent">{results.references?.kGroup}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-text-dim">Capaciteit</span><span className="font-mono text-accent">{results.references?.capacity}</span></div>
                    <div className="flex justify-between border-b border-border pb-1"><span className="text-text-dim">Kortsluiting</span><span className="font-mono text-accent">{results.references?.shortCircuit}</span></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 pt-8 border-t border-border flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm border-2 ${
                currentStep === 0 
                  ? 'opacity-0 pointer-events-none' 
                  : 'bg-bg-input border-border text-text-main hover:border-text-dim'
              }`}
            >
              <ArrowLeft size={18} />
              Terug
            </button>
            
            <div className="hidden sm:flex items-center gap-2">
              {STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === currentStep ? 'w-8 bg-accent' : 'w-2 bg-border'
                  }`}
                />
              ))}
            </div>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-10 py-3 bg-accent text-white rounded-xl font-bold text-sm shadow-2xl shadow-accent/20 hover:scale-[1.02] transition-all"
              >
                Volgende
                <ArrowRight size={18} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold text-sm shadow-xl hover:bg-gray-100 transition-all border border-gray-200"
                >
                  <FileText size={18} />
                  Resultatenblad
                </button>
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-2 px-10 py-3 bg-accent text-white rounded-xl font-bold text-sm shadow-2xl shadow-accent/20 hover:scale-[1.02] transition-all"
                >
                  Opnieuw
                  <CalcIcon size={18} />
                </button>
              </div>
            ) }
          </div>
        </section>

        {/* Right Sidebar: Validation & Notes */}
        <aside className="bg-bg-main p-8 hidden lg:flex flex-col gap-8 print:hidden overflow-y-auto">
          <div>
            <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-widest mb-6 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success" />
              Validatie-Checks
            </h2>
            <div className="space-y-3">
              <div className={`flex items-center gap-4 p-4 bg-bg-panel border rounded-xl ${results.isOverloaded ? 'border-error/50 bg-error/5' : 'border-border'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${results.isOverloaded ? 'bg-error text-white' : 'bg-success text-white'}`}>
                  {results.isOverloaded ? 'X' : '✓'}
                </div>
                <div>
                  <div className="text-xs font-bold font-mono">Belasting</div>
                  <div className={`text-[10px] ${results.isOverloaded ? 'text-error font-bold' : 'text-text-dim'}`}>
                    {results.isOverloaded ? 'Overbelast: IB > In' : 'I_B ≤ I_n'}
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-4 p-4 bg-bg-panel border rounded-xl ${results.voltageDrop > state.voltage * 0.05 ? 'border-warning/50' : 'border-border'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${results.voltageDrop > state.voltage * 0.05 ? 'bg-warning text-black' : 'bg-success text-white'}`}>
                  {results.voltageDrop > state.voltage * 0.05 ? '!' : '✓'}
                </div>
                <div>
                  <div className="text-xs font-bold font-mono">Spanningsverlies</div>
                  <div className="text-[10px] text-text-dim">Max 5%: {results.voltageDrop.toFixed(1)}V</div>
                </div>
              </div>
              {results.maxShortCircuitLength && (
                <div className={`flex items-center gap-4 p-4 bg-bg-panel border rounded-xl ${results.isShortCircuitExceeded ? 'border-error/50 bg-error/5' : 'border-border'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${results.isShortCircuitExceeded ? 'bg-error text-white' : 'bg-success text-white'}`}>
                    {results.isShortCircuitExceeded ? 'X' : '✓'}
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono">Maximale Lengte (KS)</div>
                    <div className={`text-[10px] ${results.isShortCircuitExceeded ? 'text-error' : 'text-text-dim'}`}>
                      {results.isShortCircuitExceeded ? 'AFGEKEURD' : `NEN 53.F: ${results.maxShortCircuitLength}m`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
             <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
              <Info size={14} className="text-accent" />
              NEN 1010:2020 Notities
            </h2>
            <div className="bg-bg-input/50 p-4 rounded-xl border border-border text-[11px] leading-relaxed text-text-dim italic outline outline-1 outline-accent/20">
              "Geselecteerde reductietabel voor groepering: {
                INSTALLATION_METHODS.find(m => m.id === state.installationMethod)?.groupingTable === 'tray_perf' ? 'Tabel 52.B.20' : 
                INSTALLATION_METHODS.find(m => m.id === state.installationMethod)?.groupingTable === 'ladder' ? 'Tabel 52.B.21' : 
                'Tabel 52.B.17'
              }"
            </div>
            <div className="bg-bg-input/50 p-4 rounded-xl border border-border text-[11px] leading-relaxed text-text-dim italic">
              "Bij harmonischen (vooral de derde) moet de N-geleider mogelijk een grotere doorsnede hebben (zie bijlage 52.E)."
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button 
              onClick={handleRestart}
              className="w-full bg-bg-panel text-text-dim border border-border text-[10px] font-bold py-2 rounded-lg hover:text-text-main transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              <CalcIcon size={12} />
              Nieuwe Berekening
            </button>
            <button 
              onClick={() => setShowReport(true)}
              className="w-full bg-accent text-white border border-accent/20 text-xs font-bold py-3 rounded-lg hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
            >
              <Printer size={14} />
              Rapport Genereren
            </button>
          </div>
        </aside>
      </main>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReport(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 sm:p-8 flex flex-col items-center overflow-y-auto print:p-0 print:static print:bg-white"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-black w-full max-w-2xl my-auto rounded-2xl shadow-2xl flex flex-col print:shadow-none print:rounded-none print:my-0"
              ref={reportRef}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2 text-accent font-bold">
                  <FileText size={20} />
                  Kabelberekeningsrapport
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-accent/90">
                    <Printer size={16} /> Print (.pdf)
                  </button>
                  <button onClick={() => setShowReport(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Report Body */}
              <div className="p-6 sm:p-10 flex-1 space-y-8 print:p-8">
                {/* Company & Client Info */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black tracking-tighter text-accent">FACTA</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] -mt-1">elektrotechniek</span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div className="flex items-center gap-2 font-medium text-gray-800"><MapPin size={14} />Uitgeest, Nederland</div>
                      <div>NEN 1010 Specialist</div>
                      <div>Telefoon: [Bedrijfsnummer]</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex-1 space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={14} /> Klantinformatie
                    </h3>
                    <div className="space-y-4 font-sans">
                      <div className="group">
                        <label className="text-[10px] text-gray-400 uppercase block mb-1">Klantnaam</label>
                        <input 
                          type="text" 
                          placeholder="Bijv. Jansen Installatietechniek" 
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-transparent border-b border-gray-200 outline-none focus:border-accent text-sm print:border-none"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[10px] text-gray-400 uppercase block mb-1">Project Referentie</label>
                        <input 
                          type="text" 
                          placeholder="Bijv. Nieuwbouw Hal A" 
                          value={projectRef}
                          onChange={(e) => setProjectRef(e.target.value)}
                          className="w-full bg-transparent border-b border-gray-200 outline-none focus:border-accent text-sm print:border-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Result */}
                <div className="bg-accent text-white p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
                  <div className="relative z-10 text-center sm:text-left">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Geadviseerde Aderdoorsnede</div>
                    <div className="text-6xl sm:text-7xl font-black tracking-tighter flex items-center justify-center sm:justify-start gap-2">
                       {results.selectedCrossSection}
                       <span className="text-xl font-light opacity-50">mm²</span>
                    </div>
                  </div>
                  <div className="text-right space-y-2 relative z-10">
                    <div className="text-lg font-bold">Koper (Cu)</div>
                    <div className="text-sm opacity-60">{state.insulationType} Isolatie</div>
                    {results.isOverloaded && (
                      <div className="text-[10px] font-bold text-white uppercase bg-red-600 px-2 py-1 rounded inline-block animate-pulse">
                        Systeem Overbelast
                      </div>
                    )}
                    {results.isLimitedByVoltageDrop && (
                      <div className="text-[10px] font-bold text-white uppercase bg-white/20 px-2 py-1 rounded inline-block">
                        Geselecteerd op spanningsverlies
                      </div>
                    )}
                    <div className="mt-4 px-4 py-2 bg-white/10 rounded-full text-xs font-bold border border-white/10 inline-block uppercase">
                      Norm: NEN 1010:2020
                    </div>
                  </div>
                  <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* Collapsible Sections */}
                <div className="space-y-4">
                  {/* Detailed Calculations */}
                  <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setExpandedSummary(prev => ({ ...prev, calculations: !prev.calculations }))}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors print:hidden"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                          <CalcIcon size={16} />
                        </div>
                        <span className="text-sm font-bold text-gray-800 uppercase tracking-tight">Gedetailleerde Berekening</span>
                      </div>
                      {expandedSummary.calculations ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>
                    
                    <motion.div 
                      initial={false}
                      animate={{ height: expandedSummary.calculations ? 'auto' : '0px', opacity: expandedSummary.calculations ? 1 : 0 }}
                      className="overflow-hidden print:!h-auto print:!opacity-100"
                    >
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Elektrische Parameters</h4>
                            <table className="w-full text-xs">
                              <tbody className="divide-y divide-gray-50">
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Vermogen (P)</td><td className="font-bold">{state.powerInWatts} W</td></tr>
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Spanning (U)</td><td className="font-bold">{state.voltage} V</td></tr>
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Bedrijfsstroom (I<sub>B</sub>)</td><td className="font-bold">{results.operatingCurrent.toFixed(2)} A</td></tr>
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Beveiliging (I<sub>n</sub>)</td><td className="font-bold">{state.protectionCurrent} A</td></tr>
                              </tbody>
                            </table>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Klimaat & Installatie</h4>
                            <table className="w-full text-xs">
                              <tbody className="divide-y divide-gray-50">
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Methode</td><td className="font-bold">{state.installationMethod}</td></tr>
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Stelsel / Aardlek</td><td className="font-bold">{state.earthingSystem} / {state.hasRCD ? 'RCD ✓' : 'Geen RCD'}</td></tr>
                                {state.earthingSystem === 'TT' && !state.hasRCD && (
                                  <tr className="py-2 flex justify-between"><td className="text-gray-500">Aardweerstand (R<sub>a</sub>)</td><td className="font-bold">{state.earthResistance} Ω</td></tr>
                                )}
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Omgevingstemp.</td><td className="font-bold">{state.ambientTemperature}°C</td></tr>
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Temp. factor (k<sub>t</sub>)</td><td className="font-bold">{results.correctionFactorTemp.toFixed(2)}</td></tr>
                                <tr className="py-2 flex justify-between"><td className="text-gray-500">Groepsfactor (k<sub>g</sub>)</td><td className="font-bold">{results.correctionFactorGrouping.toFixed(2)}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">NEN 1010 Validatie Formule</h4>
                          <div className="flex flex-wrap gap-4 text-xs">
                            <div className="bg-gray-50 p-3 rounded-lg flex-1 min-w-[200px]">
                              <div className="text-[9px] text-gray-400 uppercase mb-1">Ontwerpstroom (I<sub>Z</sub>)</div>
                              <div className="font-mono font-bold text-accent">I<sub>Z</sub> = I<sub>tab</sub> × k<sub>t</sub> × k<sub>g</sub></div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg flex-1 min-w-[200px]">
                              <div className="text-[9px] text-gray-400 uppercase mb-1">Voorwaarde</div>
                              <div className="font-mono font-bold text-gray-700">I<sub>B</sub> ≤ I<sub>n</sub> ≤ I<sub>Z</sub></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* NEN 1010 Normen & Referenties */}
                  <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setExpandedSummary(prev => ({ ...prev, references: !prev.references }))}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors print:hidden"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                          <Scale size={16} />
                        </div>
                        <span className="text-sm font-bold text-gray-800 uppercase tracking-tight">Normatieve Referenties</span>
                      </div>
                      {expandedSummary.references ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>
                    
                    <motion.div 
                      initial={false}
                      animate={{ height: expandedSummary.references ? 'auto' : '0px', opacity: expandedSummary.references ? 1 : 0 }}
                      className="overflow-hidden print:!h-auto print:!opacity-100"
                    >
                      <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
                          <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                            <div className="text-gray-400 uppercase tracking-tighter">Capaciteit</div>
                            <div className="font-bold text-accent">{results.references?.capacity}</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                            <div className="text-gray-400 uppercase tracking-tighter">Temp. Correctie</div>
                            <div className="font-bold text-accent">{results.references?.kTemp}</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                            <div className="text-gray-400 uppercase tracking-tighter">Groepering</div>
                            <div className="font-bold text-accent">{results.references?.kGroup}</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                            <div className="text-gray-400 uppercase tracking-tighter">Kortsluiting</div>
                            <div className="font-bold text-accent">{state.earthingSystem === 'TN' ? results.references?.shortCircuit : 'N.v.t. (TT)'}</div>
                          </div>
                        </div>
                        <div className="mt-4 p-4 bg-accent/5 rounded-xl border border-accent/10 text-[11px] text-accent/80 italic leading-relaxed">
                          Alle berekeningen zijn uitgevoerd conform NEN 1010:2020. De resultaten zijn gebaseerd op een TN-stelsel bij een nominale spanning van 230V/400V.
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Validation Results (Final Footer) */}
                <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl border border-gray-100 flex flex-col md:flex-row gap-6 md:gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">
                       <CheckCircle2 size={16} className="text-success" />
                       NEN 1010 Validatie
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className={`p-4 bg-white rounded-xl border ${results.isOverloaded ? 'border-error/50 bg-error/5' : 'border-gray-200'}`}>
                        <div className="text-[10px] text-gray-400 uppercase mb-1">Overbelasting (I<sub>B</sub> ≤ I<sub>n</sub>)</div>
                        <div className={`text-lg font-bold ${results.isOverloaded ? 'text-error' : 'text-success'}`}>{results.isOverloaded ? 'FOUT' : 'OK'}</div>
                        <div className="text-[10px] text-gray-400">{results.operatingCurrent.toFixed(1)}A ≤ {state.protectionCurrent}A</div>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-gray-200">
                        <div className="text-[10px] text-gray-400 uppercase mb-1">Spanningsverlies (ΔU)</div>
                        <div className="text-lg font-bold text-gray-900">{results.voltageDrop.toFixed(2)}V ({( (results.voltageDrop / state.voltage) * 100).toFixed(2)}%)</div>
                        <div className="text-[10px] text-gray-400">Max. 5% conform NEN 1010</div>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-gray-200">
                        <div className="text-[10px] text-gray-400 uppercase mb-1">Kortsluitbeveiliging</div>
                        <div className={`text-lg font-bold ${results.isShortCircuitExceeded ? 'text-red-600' : 'text-gray-900'}`}>
                          {state.earthingSystem === 'TN' 
                            ? (results.isShortCircuitExceeded ? 'AFGEKEURD' : (results.maxShortCircuitLength ? `${results.maxShortCircuitLength}m` : 'N.v.t.')) 
                            : (state.hasRCD ? 'N.v.t. (RCD)' : (results.maxShortCircuitLength === 0 ? 'ONMOGELIJK' : (results.isShortCircuitExceeded ? 'AFGEKEURD' : `${results.maxShortCircuitLength}m`)))}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          {state.earthingSystem === 'TN' ? (
                            results.isShortCircuitExceeded 
                              ? `MAX ${results.maxShortCircuitLength}m OVERSCHREDEN!` 
                              : 'Max. lengte (Tabel 53.F)'
                          ) : (
                            state.hasRCD ? 'Aarding via RCD' : (results.maxShortCircuitLength === 0 ? 'R_a te hoog voor automaat' : `Max. lengte bij Ra=${state.earthResistance}Ω`)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-1/3 flex flex-col justify-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Handtekening Facta</div>
                    <div className="border-b-2 border-gray-200 h-12 w-full"></div>
                    <div className="text-[10px] text-gray-400 mt-2">Gevalideerd op: {new Date().toLocaleDateString('nl-NL')}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


