import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal as TerminalIcon, Cpu, Database, List, Play, StepForward, RotateCcw, ChevronRight, Search } from 'lucide-react';
import bgImage from 'figma:asset/12e3535ad8c44a4019726b6e78f46b81e2f3cf43.png';

// --- Types ---
interface Instruction {
  addr: string;
  mnemonic: string;
  operands: string;
  pc_rel?: string;
}

interface RegisterState {
  [key: string]: string;
}

// --- Mock Data Generator ---
const generateInstructions = (count: number): Instruction[] => {
  const mnemonics = ['mov', 'add', 'ldr', 'str', 'subs', 'b', 'bl', 'stp', 'ldp', 'ret', 'cmp', 'eor', 'orr', 'ands'];
  const registers = ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'w0', 'w8', 'w9', 'w10', 'sp', 'lr'];
  
  return Array.from({ length: count }, (_, i) => {
    const addr = (0x0000007da8c3bbe0 + i * 4).toString(16).padStart(16, '0');
    const mnemonic = mnemonics[Math.floor(Math.random() * mnemonics.length)];
    const r1 = registers[Math.floor(Math.random() * registers.length)];
    const r2 = registers[Math.floor(Math.random() * registers.length)];
    const imm = `#0x${Math.floor(Math.random() * 0xff).toString(16)}`;
    
    let operands = `${r1}, ${r2}`;
    if (mnemonic === 'ldr' || mnemonic === 'str') operands = `${r1}, [${r2}, ${imm}]`;
    if (mnemonic === 'b' || mnemonic === 'bl') operands = `0x${(0x7da8c3bbe0 + Math.random() * 1000).toString(16).slice(0, 8)}`;
    if (mnemonic === 'ret') operands = '';
    
    return {
      addr: `0x${addr}`,
      mnemonic,
      operands,
      pc_rel: Math.random() > 0.7 ? 'PC' : undefined
    };
  });
};

const initialRegisters = (): RegisterState => {
  const regs: RegisterState = {};
  for (let i = 0; i <= 30; i++) {
    regs[`x${i}`] = `0x${Math.floor(Math.random() * 0xffffffffffffffff).toString(16).padStart(16, '0')}`;
  }
  regs['sp'] = '0x0000007fe7aa1830';
  regs['pc'] = '0x0000007da8c3bbe0';
  return regs;
};

// --- Components ---

const AssemblyLine = ({ 
  instruction, 
  index, 
  isActive 
}: { 
  instruction: Instruction; 
  index: number; 
  isActive: boolean 
}) => {
  const highlightOperands = (ops: string) => {
    return ops.split(/([, \[\]#])/).map((part, i) => {
      if (/^x[0-9]+|^w[0-9]+|^sp|^lr|^pc/.test(part)) return <span key={i} className="text-yellow-400/90">{part}</span>;
      if (/^#0x|^0x/.test(part)) return <span key={i} className="text-emerald-400">{part}</span>;
      if (part === '[' || part === ']' || part === ',') return <span key={i} className="text-gray-500">{part}</span>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`relative flex items-center font-mono py-1 px-2 text-[13px] transition-all duration-200 ${isActive ? 'bg-yellow-500/10' : 'hover:bg-white/5'}`}>
      <span className={`w-12 text-right mr-4 select-none text-[11px] ${isActive ? 'text-yellow-500 font-bold' : 'text-slate-600'}`}>{index}</span>
      <span className={`text-[12px] mr-4 font-light ${isActive ? 'text-yellow-200/50' : 'text-slate-500'}`}>{instruction.addr.slice(-8)}</span>
      <span className={`w-16 uppercase font-bold tracking-tight ${isActive ? 'text-yellow-400' : 'text-blue-400'}`}>{instruction.mnemonic}</span>
      <span className="text-slate-300 flex-1 truncate">{highlightOperands(instruction.operands)}</span>
      {instruction.pc_rel && <span className="text-slate-600 text-[10px] ml-2 italic">; {instruction.pc_rel}</span>}
      {isActive && (
        <motion.div 
          layoutId="pointer"
          className="absolute left-0 w-1 h-[80%] my-auto inset-y-0 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
    </div>
  );
};

const RegisterItem = ({ name, value, isChanged }: { name: string; value: string; isChanged: boolean }) => (
  <div className="flex items-center gap-2 font-mono text-[12px] group">
    <span className="text-gray-500 min-w-[32px]">{name}</span>
    <motion.span 
      animate={isChanged ? { color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.1)' } : { color: '#e5e7eb', backgroundColor: 'transparent' }}
      className="px-1 rounded"
    >
      {value.slice(0, 18)}
    </motion.span>
  </div>
);

const MemoryCell = ({ val }: { val: number }) => (
  <span className={`text-[12px] font-mono ${val === 0 ? 'text-gray-700' : 'text-gray-300'}`}>
    {val.toString(16).padStart(2, '0')}
  </span>
);

export default function DebuggerApp() {
  const [pcIndex, setPcIndex] = useState(1286);
  const [registers, setRegisters] = useState<RegisterState>(initialRegisters());
  const [changedRegs, setChangedRegs] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  
  const instructions = useMemo(() => generateInstructions(2000), []);
  const memory = useMemo(() => Array.from({ length: 1024 }, () => Math.floor(Math.random() * 256)), []);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.children[pcIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [pcIndex]);

  const handleStep = () => {
    const nextIndex = pcIndex + 1;
    setPcIndex(nextIndex);
    
    // Simulate register changes
    const randomReg = `x${Math.floor(Math.random() * 31)}`;
    const newValue = `0x${Math.floor(Math.random() * 0xffffffffffffffff).toString(16).padStart(16, '0')}`;
    
    setRegisters(prev => {
      const next = { ...prev, [randomReg]: newValue, pc: instructions[nextIndex].addr };
      return next;
    });
    setChangedRegs([randomReg, 'pc']);
    setTimeout(() => setChangedRegs([]), 1000);
    
    setHistory(prev => [...prev.slice(-10), `> step ${nextIndex}`]);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    if (command === 'n' || command === 'next' || command === 's') {
      handleStep();
    } else if (command === 'r' || command === 'reset') {
      setPcIndex(1286);
      setHistory([]);
    }
    setCommand('');
  };

  return (
    <div className="relative h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Background with Blur/Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-40 grayscale-[0.5]"
        style={{ 
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 pointer-events-none" />
      
      {/* Scanline Overlay */}
      <div className="absolute inset-0 z-2 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] opacity-20" />

      {/* Main Layout */}
      <div className="relative z-10 grid grid-cols-[380px_1fr_320px] h-full p-4 gap-4 backdrop-blur-[1px]">
        
        {/* Left Pane: Assembly */}
        <div className="flex flex-col bg-slate-900/60 border border-slate-700/50 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/40">
            <div className="flex items-center gap-2">
              <List size={16} className="text-blue-400" />
              <span className="text-[12px] font-bold tracking-widest uppercase">Instructions</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{pcIndex} / {instructions.length}</span>
          </div>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent custom-scrollbar"
          >
            {instructions.map((ins, i) => (
              <AssemblyLine 
                key={i} 
                instruction={ins} 
                index={i} 
                isActive={i === pcIndex} 
              />
            ))}
          </div>
        </div>

        {/* Middle Pane: Registers & Status & Terminal */}
        <div className="flex flex-col gap-4">
          
          {/* Top: Status Card */}
          <div className="grid grid-cols-4 gap-4 bg-slate-900/60 border border-slate-700/50 p-4 rounded-lg backdrop-blur-xl shadow-lg">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Step</span>
              <span className="font-mono text-xl text-yellow-500 font-bold">{pcIndex}</span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Instruction Pointer</span>
              <span className="font-mono text-xl text-emerald-400 truncate tracking-tight">{instructions[pcIndex]?.addr}</span>
            </div>
            <div className="flex flex-col items-end justify-center">
              <div className="flex gap-1 bg-slate-950/50 p-1 rounded-full border border-slate-700/50">
                <button 
                  onClick={() => {}} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors group opacity-50 cursor-not-allowed"
                  title="Run (F5)"
                >
                  <Play size={18} className="text-emerald-500" />
                </button>
                <button 
                  onClick={handleStep}
                  className="p-2 hover:bg-yellow-500/20 rounded-full transition-colors group"
                  title="Step Into (F7)"
                >
                  <StepForward size={18} className="text-yellow-500 group-active:scale-90 transition-transform" />
                </button>
                <button 
                  onClick={() => setPcIndex(1286)}
                  className="p-2 hover:bg-red-500/10 rounded-full transition-colors group"
                  title="Restart"
                >
                  <RotateCcw size={18} className="text-slate-400 group-active:rotate-180 transition-transform duration-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Center: Registers */}
          <div className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg overflow-hidden flex flex-col backdrop-blur-md">
            <div className="flex items-center gap-2 p-3 border-b border-slate-700/50 bg-slate-800/40">
              <Cpu size={16} className="text-emerald-400" />
              <span className="text-[12px] font-bold tracking-widest uppercase">Registers</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 p-4 overflow-y-auto">
              {Object.entries(registers).slice(0, 31).map(([name, val]) => (
                <RegisterItem 
                  key={name} 
                  name={name} 
                  value={val} 
                  isChanged={changedRegs.includes(name)} 
                />
              ))}
              <div className="col-span-full border-t border-slate-700/50 my-2 pt-2">
                <span className="text-[10px] text-slate-500 uppercase mb-2 block">Special Purpose</span>
                <div className="grid grid-cols-2 gap-4">
                  <RegisterItem name="SP" value={registers.sp} isChanged={changedRegs.includes('sp')} />
                  <RegisterItem name="PC" value={registers.pc} isChanged={changedRegs.includes('pc')} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Terminal */}
          <div className="bg-slate-950/80 border border-slate-700/50 rounded-lg h-[180px] flex flex-col font-mono shadow-inner">
            <div className="flex-1 p-3 text-[12px] overflow-y-auto scrollbar-none opacity-80">
              <div className="text-slate-500 mb-2">Debugger initialised. Ready for commands. Type 'n' to step.</div>
              {history.map((h, i) => (
                <div key={i} className="mb-1">{h}</div>
              ))}
            </div>
            <form onSubmit={handleCommand} className="flex items-center gap-2 p-2 border-t border-slate-700/50 bg-slate-900/50">
              <ChevronRight size={16} className="text-emerald-500 animate-pulse" />
              <input 
                type="text" 
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                autoFocus
                placeholder="Enter command (n/step, r/reset)..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] placeholder:text-slate-600"
              />
              <TerminalIcon size={14} className="text-slate-600" />
            </form>
          </div>
        </div>

        {/* Right Pane: Memory */}
        <div className="flex flex-col bg-slate-900/60 border border-slate-700/50 rounded-lg overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-purple-400" />
              <span className="text-[12px] font-bold tracking-widest uppercase">Memory (Hex)</span>
            </div>
            <Search size={14} className="text-slate-500" />
          </div>
          <div className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
            <div className="grid grid-cols-[auto_1fr] gap-x-4">
              {Array.from({ length: 64 }, (_, i) => {
                const addr = (0x7fe7aa1830 + i * 16).toString(16);
                return (
                  <React.Fragment key={i}>
                    <span className="text-[11px] text-slate-500 font-mono">0x{addr.slice(-8)}</span>
                    <div className="grid grid-cols-8 gap-x-1">
                      {memory.slice(i * 8, i * 8 + 8).map((val, idx) => (
                        <MemoryCell key={idx} val={val} />
                      ))}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Status Bar */}
      <div className="relative z-20 h-7 bg-slate-900 border-t border-slate-700/50 flex items-center justify-between px-4 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300">PROCESS: ATTACHED (PID 4921)</span>
          </div>
          <span>ARCH: AARCH64</span>
          <span>ENDIAN: LITTLE</span>
        </div>
        <div className="flex items-center gap-4">
          <span>THREADS: 1 RUNNING</span>
          <span className="text-slate-300">FEBRUARY 4, 2026 - 14:05:22</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}
