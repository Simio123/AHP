import React, { useMemo, useState } from "react";
// NOVO: Mais ícones para uma interface mais rica
import { PlusCircle, Trash2, Trophy, Info, ListChecks, Layers3, Edit3, User, SlidersHorizontal, Sparkles } from 'lucide-react';

// Tipos, Constantes e Funções Matemáticas (sem alterações)
type Matrix = number[][];
type ViewMode = 'creator' | 'user';
const DEFAULT_CRITERIA = ["Curva de Aprendizagem", "Mercado de Trabalho", "Ecossistema", "Versatilidade", "Potencial Salarial"];
const DEFAULT_ALTERNATIVES = ["Python", "JavaScript/TS", "Java", "C#", "Go"];
const RI_MAP: Record<number, number> = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
function normalizeMatrix(matrix: Matrix): Matrix {
  const n = matrix.length;
  if (n === 0) return [];
  const colSums = Array(n).fill(0);
  for (let j = 0; j < n; j++) { for (let i = 0; i < n; i++) { colSums[j] += matrix[i][j]; } }
  return matrix.map((row) => row.map((val, j) => (colSums[j] ? val / colSums[j] : 0)));
}
function getPriorityVector(matrix: Matrix): number[] {
  if (matrix.length === 0) return [];
  const normalized = normalizeMatrix(matrix);
  const rowMeans = normalized.map((row) => row.reduce((a, b) => a + b, 0) / row.length);
  const sum = rowMeans.reduce((a, b) => a + b, 0);
  if (sum === 0) return rowMeans.map(() => 0);
  return rowMeans.map((v) => v / sum);
}
function calcLambdaMax(matrix: Matrix, priorities: number[]): number {
  const n = matrix.length;
  if (n === 0) return 0;
  const weightedSums = matrix.map((row) => row.reduce((acc, val, j) => acc + val * priorities[j], 0));
  const lambdaVals = weightedSums.map((val, i) => (priorities[i] ? val / priorities[i] : 0));
  return lambdaVals.reduce((a, b) => a + b, 0) / n;
}
function calcConsistency(matrix: Matrix, priorities: number[]): { CI: number; CR: number } {
  const n = matrix.length;
  if (n <= 2) return { CI: 0, CR: 0 };
  const lambdaMax = calcLambdaMax(matrix, priorities);
  const CI = (lambdaMax - n) / (n - 1);
  const RI = RI_MAP[n] ?? 1.49;
  const CR = RI === 0 ? 0 : CI / RI;
  return { CI, CR };
}
function buildMatrixFromPairs(names: string[], pairs: Record<string, number>): Matrix {
  const n = names.length;
  const matrix: Matrix = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${i}_${j}`;
      const sliderValue = pairs[key] ?? 0;
      const roundedSlider = Math.round(sliderValue);
      let saatyValue = 1;
      if (roundedSlider !== 0) {
        const magnitude = Math.abs(roundedSlider) + 1;
        saatyValue = roundedSlider > 0 ? magnitude : 1 / magnitude;
      }
      matrix[i][j] = saatyValue;
      matrix[j][i] = 1 / saatyValue;
    }
  }
  return matrix;
}

// Componente Slider (sem alterações na lógica, apenas no estilo)
interface ComparisonSliderProps { item1: string; item2: string; value: number; onChange: (value: number) => void; }
const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ item1, item2, value, onChange }) => {
  const roundedValue = Math.round(value);
  const magnitude = roundedValue === 0 ? 1 : Math.abs(roundedValue) + 1;
  const displayValue = `${magnitude}x`;
  const position = ((roundedValue + 8) / 16) * 100;
  const winner = roundedValue > 0 ? item2 : roundedValue < 0 ? item1 : null;
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-4">
      <div className="flex items-center w-full gap-4">
        <div className={`w-1/3 text-center px-2 py-3 bg-slate-700/50 rounded-lg shadow-lg font-semibold transition-all duration-300 ${winner === item1 ? 'text-primary-light scale-105' : 'text-slate-300'}`}>{item1}</div>
        <div className="w-1/3 flex-shrink-0 h-2 bg-slate-700 rounded-full relative">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-200" style={{ left: `${position}%` }}>
            <div className="h-5 w-5 bg-primary rounded-full border-2 border-white shadow-lg"></div>
            <div className="mt-2 px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">{displayValue}</div>
          </div>
        </div>
        <div className={`w-1/3 text-center px-2 py-3 bg-slate-700/50 rounded-lg shadow-lg font-semibold transition-all duration-300 ${winner === item2 ? 'text-primary-light scale-105' : 'text-slate-300'}`}>{item2}</div>
      </div>
      <input type="range" min={-8} max={8} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-2 cursor-pointer appearance-none h-2 bg-slate-700 rounded-lg group [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-200 group-hover:[&::-webkit-slider-thumb]:scale-125 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-200 group-hover:[&::-moz-range-thumb]:scale-125" />
    </div>
  );
};

// Componente Principal
export default function App() {
  const [view, setView] = useState<ViewMode>('creator');
  const [criteria, setCriteria] = useState<string[]>(DEFAULT_CRITERIA);
  const [alternatives, setAlternatives] = useState<string[]>(DEFAULT_ALTERNATIVES);
  const [criteriaPairs, setCriteriaPairs] = useState<Record<string, number>>({});
  const [altPairsByCriterion, setAltPairsByCriterion] = useState<Record<string, Record<string, number>>>({});
  const [resultsVisible, setResultsVisible] = useState(false);

  // Lógica e Cálculos (sem alterações)
  const criteriaMatrix = useMemo(() => buildMatrixFromPairs(criteria, criteriaPairs), [criteria, criteriaPairs]);
  const criteriaPriorities = useMemo(() => getPriorityVector(criteriaMatrix), [criteriaMatrix]);
  const criteriaConsistency = useMemo(() => calcConsistency(criteriaMatrix, criteriaPriorities), [criteriaMatrix, criteriaPriorities]);
  const altPrioritiesPerCriterion = useMemo(() => {
    return criteria.map((_, cIdx) => {
      const map = altPairsByCriterion[`c_${cIdx}`] ?? {};
      const matrix = buildMatrixFromPairs(alternatives, map);
      const priorities = getPriorityVector(matrix);
      const consistency = calcConsistency(matrix, priorities);
      return { matrix, priorities, consistency };
    });
  }, [criteria, alternatives, altPairsByCriterion]);
  const finalScores = useMemo(() => {
    const nAlt = alternatives.length;
    if (nAlt === 0 || criteria.length === 0) return [];
    const scores = Array(nAlt).fill(0);
    criteriaPriorities.forEach((weight, i) => {
      const altPriorities = altPrioritiesPerCriterion[i]?.priorities ?? Array(nAlt).fill(1 / nAlt);
      for (let a = 0; a < nAlt; a++) { scores[a] += weight * altPriorities[a]; }
    });
    return scores.map((s, idx) => ({ name: alternatives[idx], score: s }));
  }, [criteriaPriorities, altPrioritiesPerCriterion, alternatives, criteria.length]);
  const sortedFinal = useMemo(() => [...finalScores].sort((a, b) => b.score - a.score), [finalScores]);
  const addHandler = (setter: React.Dispatch<React.SetStateAction<string[]>>, baseName: string) => setter(arr => [...arr, `${baseName} ${arr.length + 1}`]);
  const removeHandler = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter(arr => arr.filter((_, idx) => idx !== index));
  const setCriteriaPair = (i: number, j: number, value: number) => setCriteriaPairs(p => ({ ...p, [`${i}_${j}`]: value }));
  const setAltPair = (critIdx: number, i: number, j: number, value: number) => {
    const critKey = `c_${critIdx}`;
    setAltPairsByCriterion(prev => ({ ...prev, [critKey]: { ...(prev[critKey] ?? {}), [`${i}_${j}`]: value }, }));
  };
  const handleCalculateResults = () => {
    setResultsVisible(false);
    setTimeout(() => setResultsVisible(true), 50);
  }

  // Component Card Genérico para evitar repetição
  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-slate-800/50 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-lg transition-all duration-300 hover:border-primary/50 hover:shadow-inner-glow hover:shadow-glow ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="relative bg-slate-900 min-h-screen font-sans text-slate-200 selection:bg-primary/30 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute left-1/2 top-1/2 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary via-transparent to-slate-800 animate-[rotateBg_20s_linear_infinite]"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-light pb-2">
            Decisor AHP de Linguagens de Programação
          </h1>
          <p className="text-md text-slate-400 mt-2 max-w-2xl mx-auto">
            Defina seus critérios, compare as principais linguagens e descubra qual se encaixa perfeitamente nos seus objetivos.
          </p>
        </header>

        <div className="flex justify-center mb-10">
          <div className="bg-slate-800/50 p-1 rounded-lg flex gap-1 border border-slate-700">
            {/* NOVO: Botões com ícones e transição mais suave */}
            <button onClick={() => setView('creator')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${view === 'creator' ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:bg-slate-700/50'}`}>
              <Edit3 size={16} /> Modo Criador
            </button>
            <button onClick={() => setView('user')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${view === 'user' ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:bg-slate-700/50'}`}>
              <User size={16} /> Modo Usuário
            </button>
          </div>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <section className="lg:col-span-2 space-y-6 animate-fade-in">
            {view === 'creator' && (
              <>
                <Card>
                  <div className="p-6">
                    {/* NOVO: Título com ícone */}
                    <div className="flex items-center gap-3">
                      <ListChecks className="text-primary" size={24} />
                      <h2 className="font-bold text-xl text-white">1. Critérios de Decisão</h2>
                    </div>
                    <div className="mt-4 space-y-2">
                      {criteria.map((c, i) => (
                        <div key={i} className="flex gap-2 items-center group">
                          {/* NOVO: Input com estilo de foco melhorado */}
                          <input value={c} onChange={e => setCriteria(arr => arr.map((x, idx) => (idx === i ? e.target.value : x)))} className="flex-1 bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-primary/50 focus:border-primary/0 outline-none transition"/>
                          <button onClick={() => removeHandler(setCriteria, i)} className="p-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/40 transition-all text-xs font-semibold opacity-50 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <button onClick={() => addHandler(setCriteria, 'Critério')} className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary-light border border-primary/30 rounded-md hover:bg-primary/30 text-sm font-medium transition-all duration-200 active:scale-95">
                      <PlusCircle size={16} /> Adicionar Critério
                    </button>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center gap-3">
                      <Layers3 className="text-primary" size={24} />
                      <h2 className="font-bold text-xl text-white">2. Alternativas</h2>
                    </div>
                    <div className="mt-4 space-y-2">
                      {alternatives.map((a, i) => (
                        <div key={i} className="flex gap-2 items-center group">
                          <input value={a} onChange={e => setAlternatives(arr => arr.map((x, idx) => (idx === i ? e.target.value : x)))} className="flex-1 bg-slate-700 border border-slate-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-primary/50 focus:border-primary/0 outline-none transition"/>
                          <button onClick={() => removeHandler(setAlternatives, i)} className="p-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/40 transition-all text-xs font-semibold opacity-50 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                   <div className="p-6 pt-0">
                    <button onClick={() => addHandler(setAlternatives, 'Alternativa')} className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary-light border border-primary/30 rounded-md hover:bg-primary/30 text-sm font-medium transition-all duration-200 active:scale-95">
                      <PlusCircle size={16} /> Adicionar Alternativa
                    </button>
                  </div>
                </Card>
              </>
            )}

            {view === 'user' && (
              <>
                <Card>
                  <div className="p-6">
                    <h2 className="font-bold text-xl text-white">Informações da Análise</h2>
                    <div className="mt-4">
                      <h3 className="font-semibold text-primary-light flex items-center gap-2"><ListChecks size={16} /> Critérios a Avaliar:</h3>
                      <ul className="list-disc list-inside mt-2 text-slate-300 space-y-1 pl-2">
                          {criteria.map(c => <li key={c}>{c}</li>)}
                      </ul>
                    </div>
                    <div className="mt-6">
                      <h3 className="font-semibold text-primary-light flex items-center gap-2"><Layers3 size={16} /> Alternativas a Classificar:</h3>
                        <ul className="list-disc list-inside mt-2 text-slate-300 space-y-1 pl-2">
                          {alternatives.map(a => <li key={a}>{a}</li>)}
                      </ul>
                    </div>
                  </div>
                </Card>
                {/* NOVO: Botão de calcular com gradiente e ícone */}
                <button onClick={handleCalculateResults} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 text-lg font-bold shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-100">
                    <Sparkles size={20} /> Calcular Resultado
                </button>
              </>
            )}
          </section>

          <section className="lg:col-span-3 space-y-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            {view === 'user' && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="text-primary" size={24} />
                    <h2 className="font-bold text-xl text-white">Ajuste as Suas Preferências</h2>
                  </div>
                  <div className="mt-4 space-y-2 divide-y divide-slate-700/50">
                    {criteria.length > 1 && criteria.map((c1, i) => criteria.slice(i + 1).map((c2, j_offset) => {
                        const j = i + 1 + j_offset;
                        return <ComparisonSlider key={`${i}_${j}`} item1={c1} item2={c2} value={criteriaPairs[`${i}_${j}`] ?? 0} onChange={v => setCriteriaPair(i, j, v)} />;
                    }))}
                  </div>
                </div>
                <div className="p-6 pt-2 text-sm text-slate-400 flex items-center gap-2">
                  <div className="relative has-tooltip">
                    <Info size={16} className="cursor-help" />
                    <div className="tooltip -top-20 -left-28 w-60 p-2 bg-slate-900 border border-slate-700 rounded-md shadow-lg text-xs">A Razão de Consistência (CR) mede a lógica das suas comparações. Um valor <strong>abaixo de 10%</strong> é considerado aceitável.</div>
                  </div>
                  <span>Consistência (CR):</span>
                  <span className={`font-bold transition-colors ${criteriaConsistency.CR > 0.1 ? 'text-red-400' : 'text-green-400'}`}>{(criteriaConsistency.CR * 100).toFixed(1)}%</span>
                  {criteriaConsistency.CR > 0.1 && " (Inconsistente)"}
                </div>
              </Card>
            )}

            {view === 'creator' && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="text-primary" size={24} />
                    <h2 className="font-bold text-xl text-white">3. Comparar Alternativas por Critério</h2>
                  </div>
                  <div className="mt-4 space-y-8">
                      {criteria.map((crit, cIdx) => (
                          <div key={cIdx}>
                              <h3 className="font-semibold text-lg text-primary-light border-b border-slate-700 pb-2 mb-4">Em relação a "{crit}":</h3>
                              <div className="space-y-2 divide-y divide-slate-700/50">
                                  {alternatives.length > 1 && alternatives.slice(0, -1).map((a1, i) => alternatives.slice(i + 1).map((a2, j_offset) => {
                                      const j = i + 1 + j_offset;
                                      return <ComparisonSlider key={`${i}_${j}`} item1={a1} item2={a2} value={altPairsByCriterion[`c_${cIdx}`]?.[`${i}_${j}`] ?? 0} onChange={v => setAltPair(cIdx, i, j, v)} />;
                                  }))}
                              </div>
                          </div>
                      ))}
                  </div>
                </div>
              </Card>
            )}

            {resultsVisible && view === 'user' && (
              <Card className="animate-fade-in">
                <div className="p-6">
                  <h2 className="font-bold text-2xl text-white">Resultado Final</h2>
                  <div className="mt-5 space-y-3">
                    {sortedFinal.map((s, i) => (
                      <div key={s.name} className={`group p-4 border-l-4 rounded-r-lg flex items-center justify-between gap-4 transition-all duration-300 
                        ${i === 0 
                          ? 'bg-green-500/20 border-green-400 shadow-lg shadow-green-500/10'
                          : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-primary/50'
                        }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white text-base transition-colors ${i === 0 ? 'bg-green-500' : 'bg-slate-600 group-hover:bg-primary'}`}>{i + 1}</div>
                          <div className="font-semibold text-lg text-white">{s.name}</div>
                          {i === 0 && <Trophy size={20} className="text-yellow-400" />}
                        </div>
                        <div className={`font-bold text-xl transition-colors ${i === 0 ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{(s.score * 100).toFixed(2)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}