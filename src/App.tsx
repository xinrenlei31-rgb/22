/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Pause, 
  Settings, 
  Info, 
  Clock, 
  BarChart2, 
  Gamepad2,
  Trash2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// --- Constants ---
const COLS = 6;
const MAX_ROWS = 10;
const INITIAL_ROWS = 4;
const TARGET_NUMBERS = [10, 12, 15, 18, 20];
const TIME_MODE_LIMIT = 8; // seconds

type GameMode = 'classic' | 'time';
type GameStatus = 'menu' | 'playing' | 'gameOver' | 'paused';

interface Block {
  id: string;
  value: number;
  row: number; // 0 = bottom, 10 = top (game over)
  col: number;
  isRemoving?: boolean;
}

// --- Icons ---
const AppLogo = () => (
  <div className="flex items-center gap-2 mb-8">
    <div className="relative">
      <div className="w-12 h-12 bg-cyan-500 rounded-xl rotate-12 absolute -inset-1 blur-sm opacity-50"></div>
      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center relative shadow-lg">
        <span className="text-white font-bold text-2xl font-display">∑</span>
      </div>
    </div>
    <div>
      <h1 className="text-3xl font-extrabold font-display tracking-tight text-white leading-tight">SUM-UP</h1>
      <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-cyan-400/80">Puzzle Academy</p>
    </div>
  </div>
);

// --- Helpers ---
const generateId = () => Math.random().toString(36).substring(2, 9);
const getRandomValue = () => Math.floor(Math.random() * 9) + 1;

export default function App() {
  const [status, setStatus] = useState<GameStatus>('menu');
  const [mode, setMode] = useState<GameMode>('classic');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [target, setTarget] = useState<number>(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_MODE_LIMIT);
  const [isWrong, setIsWrong] = useState(false);

  // --- Audio placeholders (feedback) ---
  const playPop = useCallback(() => {}, []); // Add sound logic if assets were available

  // --- Initialization ---
  const initGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    const initialBlocks: Block[] = [];
    for (let r = 0; r < INITIAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        initialBlocks.push({
          id: generateId(),
          value: getRandomValue(),
          row: r,
          col: c,
        });
      }
    }
    setBlocks(initialBlocks);
    setTarget(TARGET_NUMBERS[Math.floor(Math.random() * TARGET_NUMBERS.length)]);
    setScore(0);
    setSelectedIds([]);
    setTimeLeft(TIME_MODE_LIMIT);
    setStatus('playing');
  };

  // --- Logic ---
  const addNewRow = useCallback(() => {
    setBlocks(prev => {
      // Shift everything UP
      const shifted = prev.map(b => ({ ...b, row: b.row + 1 }));
      
      // Check if any block hits the ceiling
      if (shifted.some(b => b.row >= MAX_ROWS)) {
        setStatus('gameOver');
        return prev;
      }

      // Add new row at bottom (row 0)
      const newRow: Block[] = [];
      for (let c = 0; c < COLS; c++) {
        newRow.push({
          id: generateId(),
          value: getRandomValue(),
          row: 0,
          col: c,
        });
      }
      return [...shifted, ...newRow];
    });
  }, []);

  const currentSum = useMemo(() => {
    return blocks
      .filter(b => selectedIds.includes(b.id))
      .reduce((acc, b) => acc + b.value, 0);
  }, [blocks, selectedIds]);

  const handleBlockClick = (id: string) => {
    if (status !== 'playing') return;
    
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  // Check sum
  useEffect(() => {
    if (currentSum === target) {
      // MATCH!
      const matchedIds = [...selectedIds];
      setScore(s => s + matchedIds.length * 10);
      playPop();
      
      // Mark for removal animation
      setBlocks(prev => prev.map(b => matchedIds.includes(b.id) ? { ...b, isRemoving: true } : b));
      setSelectedIds([]);

      // Actually remove after a short delay
      setTimeout(() => {
        setBlocks(prev => prev.filter(b => !matchedIds.includes(b.id)));
        setTarget(TARGET_NUMBERS[Math.floor(Math.random() * TARGET_NUMBERS.length)]);
        if (mode === 'classic') addNewRow();
        if (mode === 'time') setTimeLeft(TIME_MODE_LIMIT);
      }, 200);

    } else if (currentSum > target) {
      // WRONG (Exceeded)
      setIsWrong(true);
      setTimeout(() => {
        setIsWrong(false);
        setSelectedIds([]);
      }, 500);
    }
  }, [currentSum, target, selectedIds, mode, addNewRow, playPop]);

  // Timer logic for Time Mode
  useEffect(() => {
    if (status === 'playing' && mode === 'time') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            addNewRow();
            return TIME_MODE_LIMIT;
          }
          return prev - 0.1;
        });
      }, 100);
      return () => clearInterval(timer);
    }
  }, [status, mode, addNewRow]);

  // Keep track of high score
  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  // Game over overlay
  const renderGameOver = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8"
    >
      <XCircle className="w-16 h-16 text-rose-500 mb-4" />
      <h2 className="text-4xl font-extrabold font-display mb-2 text-white italic">GAME OVER</h2>
      <p className="text-slate-400 mb-8 uppercase tracking-widest text-sm">The ceiling was reached</p>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm mb-8 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-sm font-medium">Final Score</span>
          <span className="text-2xl font-bold text-cyan-400">{score}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-sm font-medium">Best Record</span>
          <span className="text-xl font-bold text-slate-300">{highScore}</span>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => initGame(mode)}
        className="w-full max-w-sm py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mb-4"
      >
        <RotateCcw className="w-5 h-5" />
        TRY AGAIN
      </motion.button>
      
      <button 
        onClick={() => setStatus('menu')}
        className="text-slate-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-tighter"
      >
        Back to Menu
      </button>
    </motion.div>
  );

  return (
    <div className="h-screen w-full bg-slate-950 flex items-center justify-center font-sans overflow-hidden p-2 sm:p-4">
      <div className="w-full max-w-[420px] h-full max-h-[850px] flex flex-col relative overflow-hidden">
        
        {/* --- Header --- */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Target Sum</span>
              <motion.div 
                key={target}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl font-extrabold font-display text-cyan-400 tabular-nums drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              >
                {target}
              </motion.div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Current Sum</span>
              <div className={`text-3xl font-bold tabular-nums transition-colors duration-200 ${isWrong ? 'text-rose-500 scale-110' : currentSum > 0 ? 'text-white' : 'text-slate-700'}`}>
                {currentSum}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-tighter text-slate-500">Score</span>
                <span className="font-bold text-lg tabular-nums">{score}</span>
              </div>
            </div>
            
            {mode === 'time' && (
              <div className="flex-1 max-w-[120px] ml-4">
                <div className="flex justify-between items-center mb-1">
                  <Clock className="w-3 h-3 text-cyan-500" />
                  <span className="text-[8px] text-cyan-500 font-bold uppercase">Time</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-cyan-500"
                    animate={{ width: `${(timeLeft / TIME_MODE_LIMIT) * 100}%` }}
                    transition={{ type: 'tween', ease: 'linear' }}
                  />
                </div>
              </div>
            )}

            <button 
              onClick={() => setStatus('paused')}
              className="w-10 h-10 hover:bg-white/5 rounded-xl flex items-center justify-center transition-colors"
            >
              <Pause className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* --- Game Grid --- */}
        <div className="flex-1 relative p-4 bg-slate-900/20 m-4 rounded-3xl border border-white/[0.03] shadow-inner overflow-hidden">
          {/* Danger zone line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent"></div>
          
          <div className="h-full grid grid-cols-6 grid-rows-10 gap-2 relative">
            <AnimatePresence mode="popLayout">
              {blocks.map((block) => (
                <motion.div
                  key={block.id}
                  layout
                  initial={{ scale: 0, opacity: 0, y: 100 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    y: 0,
                    gridRow: 10 - block.row,
                    gridColumn: block.col + 1
                  }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  onClick={() => handleBlockClick(block.id)}
                  className={`
                    relative cursor-pointer rounded-xl flex items-center justify-center 
                    transition-all duration-200 select-none group
                    ${selectedIds.includes(block.id) 
                      ? 'bg-cyan-500 text-slate-950 scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)] ring-2 ring-white/50' 
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 ring-1 ring-white/5'
                    }
                    ${block.isRemoving ? 'ring-4 ring-cyan-200 brightness-150' : ''}
                  `}
                  style={{
                    gridRow: 10 - block.row,
                    gridColumn: block.col + 1
                  }}
                >
                  <span className="text-xl font-bold font-display">{block.value}</span>
                  {/* Polish details */}
                  <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${selectedIds.includes(block.id) ? 'bg-white opacity-40' : 'bg-white/10'}`}></div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Empty Slots Background (Optional visual hint) */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-10 gap-2 -z-10 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
              {Array.from({ length: 60 }).map((_, i) => (
                <div key={i} className="bg-slate-800/10 border border-slate-700/20 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Footer / Quick Controls --- */}
        <div className="px-8 py-4 flex justify-between items-center bg-slate-950">
          <div className="flex gap-4">
             <button 
                onClick={() => setSelectedIds([])}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
          </div>
          <div className="flex items-center gap-2 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            <Gamepad2 className="w-3 h-3" />
            <span>Target Academy</span>
          </div>
        </div>

        {/* --- Modals/Overlays --- */}
        
        {/* Menu Overlay */}
        {status === 'menu' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950 z-[60] flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <AppLogo />
            </motion.div>

            <motion.div 
              className="space-y-4 w-full max-w-sm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={() => initGame('classic')}
                className="group relative w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center gap-3 hover:border-cyan-500/50 transition-all overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all"></div>
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Classic Survival</h3>
                  <p className="text-xs text-slate-500">Every match adds a new row. Survive as long as possible.</p>
                </div>
              </button>

              <button
                onClick={() => initGame('time')}
                className="group relative w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center gap-3 hover:border-amber-500/50 transition-all overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Speed Trial</h3>
                  <p className="text-xs text-slate-500">Timer pressure! Match fast or get flooded with rows.</p>
                </div>
              </button>
            </motion.div>

            <motion.div 
              className="mt-12 flex gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex flex-col items-center">
                <span className="text-slate-600 text-[10px] font-bold uppercase mb-1">High Score</span>
                <div className="bg-slate-900 px-4 py-1.5 rounded-full text-slate-400 text-sm font-bold border border-white/5">
                  {highScore}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Pause Overlay */}
        {status === 'paused' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-8"
          >
            <h2 className="text-4xl font-extrabold font-display italic text-white mb-8">PAUSED</h2>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button 
                onClick={() => setStatus('playing')}
                className="w-full py-4 bg-cyan-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                RESUME
              </button>
              <button 
                onClick={() => initGame(mode)}
                className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 border border-white/5"
              >
                RESTART
              </button>
              <button 
                onClick={() => setStatus('menu')}
                className="w-full py-4 bg-transparent text-slate-500 font-bold rounded-xl text-center"
              >
                EXIT TO MENU
              </button>
            </div>
          </motion.div>
        )}

        {/* Game Over Overlay */}
        {status === 'gameOver' && renderGameOver()}

      </div>
    </div>
  );
}
