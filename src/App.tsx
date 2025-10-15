import React, { useMemo, useState } from "react";

// Tipos (Types)
type Matrix = number[][];
type ViewMode = 'creator' | 'user';

// Constantes (Defaults)
const DEFAULT_CRITERIA = ["Curva de Aprendizagem", "Mercado de Trabalho", "Ecossistema", "Versatilidade", "Potencial Salarial"];
const DEFAULT_ALTERNATIVES = ["Python", "JavaScript/TS", "Java", "C#", "Go"];

// ---------- Funções Matemáticas do AHP ----------
const RI_MAP: Record<number, number> = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };

function normalizeMatrix(matrix: Matrix): Matrix {
  const n = matrix.length;
  if (n === 0) return [];
  const colSums = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j];
    }
  }
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
  const matrix: Matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

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

// ---------- Componente de UI para o Slider Visual ----------
interface ComparisonSliderProps {
  item1: string;
  item2: string;
  value: number;
  onChange: (value: number) => void;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ item1, item2, value, onChange }) => {
  const roundedValue = Math.round(value);
  const magnitude = roundedValue === 0 ? 1 : Math.abs(roundedValue) + 1;
  const displayValue = `${magnitude}x`;
  const position = ((roundedValue + 8) / 16) * 100;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      <div className="flex items-center w-full">
        <div className="w-1/3 text-center px-2 py-3 bg-slate-700/50 rounded-lg shadow-lg font-semibold">{item1}</div>
        <div className="w-1/3 flex-shrink-0 h-1 bg-slate-500/50 relative">
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${position}%` }}
          >
            <div className="h-5 w-5 bg-purple-500 rounded-full border-2 border-white shadow-lg"></div>
            <div className="mt-2 px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">{displayValue}</div>
          </div>
        </div>
        <div className="w-1/3 text-center px-2 py-3 bg-slate-700/50 rounded-lg shadow-lg font-semibold">{item2}</div>
      </div>
      <input
        type="range"
        min={-8}
        max={8}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 cursor-pointer appearance-none h-2 bg-slate-700 rounded-lg [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500"
      />
    </div>
  );
};

// ---------- Componente Principal da Aplicação ----------
export default function App() {
  const [view, setView] = useState<ViewMode>('creator');
  const [criteria, setCriteria] = useState<string[]>(DEFAULT_CRITERIA);
  const [alternatives, setAlternatives] = useState<string[]>(DEFAULT_ALTERNATIVES);

  const [criteriaPairs, setCriteriaPairs] = useState<Record<string, number>>({});
  const [altPairsByCriterion, setAltPairsByCriterion] = useState<Record<string, Record<string, number>>>({});
  const [resultsVisible, setResultsVisible] = useState(false);

  // Cálculos memorizados
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
      for (let a = 0; a < nAlt; a++) {
        scores[a] += weight * altPriorities[a];
      }
    });
    return scores.map((s, idx) => ({ name: alternatives[idx], score: s }));
  }, [criteriaPriorities, altPrioritiesPerCriterion, alternatives, criteria.length]);

  const sortedFinal = useMemo(() => [...finalScores].sort((a, b) => b.score - a.score), [finalScores]);
  
  // Funções de manipulação
  const addHandler = (setter: React.Dispatch<React.SetStateAction<string[]>>, baseName: string) => setter(arr => [...arr, `${baseName} ${arr.length + 1}`]);
  const removeHandler = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter(arr => arr.filter((_, idx) => idx !== index));
  const setCriteriaPair = (i: number, j: number, value: number) => setCriteriaPairs(p => ({ ...p, [`${i}_${j}`]: value }));
  const setAltPair = (critIdx: number, i: number, j: number, value: number) => {
    const critKey = `c_${critIdx}`;
    setAltPairsByCriterion(prev => ({
      ...prev,
      [critKey]: { ...(prev[critKey] ?? {}), [`${i}_${j}`]: value },
    }));
  };

  return (
    <div className="bg-slate-900 min-h-screen font-sans text-slate-200" style={{ backgroundImage: `radial-gradient(circle at top left, rgba(120, 113, 108, 0.2) 0%, transparent 30%), radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.2) 0%, transparent 40%)`}}>
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">Assistente Visual de Decisão AHP</h1>
          <p className="text-md text-slate-400 mt-3">Tome decisões complexas de forma visual e intuitiva.</p>
        </header>

        <div className="flex justify-center mb-8">
            <div className="bg-slate-800/50 p-1 rounded-lg flex gap-1 border border-slate-700">
                <button onClick={() => setView('creator')} className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${view === 'creator' ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                    Modo Criador
                </button>
                <button onClick={() => setView('user')} className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${view === 'user' ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                    Modo Usuário
                </button>
            </div>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <section className="lg:col-span-2 space-y-6">
            {view === 'creator' && (
              <>
                <div className="bg-slate-800/50 rounded-xl p-6 shadow-2xl border border-slate-700 backdrop-blur-sm">
                  <h2 className="font-semibold text-xl text-white">1. Critérios de Decisão</h2>
                  <div className="mt-4 space-y-2">
                    {criteria.map((c, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input value={c} onChange={e => setCriteria(arr => arr.map((x, idx) => (idx === i ? e.target.value : x)))} className="flex-1 bg-slate-700 border-slate-600 rounded-md py-2 px-3 focus:ring-purple-500 focus:border-purple-500"/>
                        <button onClick={() => removeHandler(setCriteria, i)} className="p-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/40 text-xs">Remover</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2"><button onClick={() => addHandler(setCriteria, 'Critério')} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium">Adicionar</button></div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6 shadow-2xl border border-slate-700 backdrop-blur-sm">
                  <h2 className="font-semibold text-xl text-white">2. Alternativas</h2>
                  <div className="mt-4 space-y-2">
                    {alternatives.map((a, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input value={a} onChange={e => setAlternatives(arr => arr.map((x, idx) => (idx === i ? e.target.value : x)))} className="flex-1 bg-slate-700 border-slate-600 rounded-md py-2 px-3 focus:ring-purple-500 focus:border-purple-500"/>
                        <button onClick={() => removeHandler(setAlternatives, i)} className="p-2 bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/40 text-xs">Remover</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2"><button onClick={() => addHandler(setAlternatives, 'Alternativa')} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium">Adicionar</button></div>
                </div>
              </>
            )}

             {view === 'user' && (
                <>
                 <div className="bg-slate-800/50 rounded-xl p-6 shadow-2xl border border-slate-700 backdrop-blur-sm">
                    <h2 className="font-semibold text-xl text-white">Informações da Análise</h2>
                    <div className="mt-4">
                        <h3 className="font-medium text-purple-400">Critérios a Avaliar:</h3>
                        <ul className="list-disc list-inside mt-2 text-slate-300">
                            {criteria.map(c => <li key={c}>{c}</li>)}
                        </ul>
                    </div>
                    <div className="mt-6">
                        <h3 className="font-medium text-purple-400">Alternativas a Serem Classificadas:</h3>
                         <ul className="list-disc list-inside mt-2 text-slate-300">
                            {alternatives.map(a => <li key={a}>{a}</li>)}
                        </ul>
                    </div>
                </div>
                <button onClick={() => setResultsVisible(true)} className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 text-lg font-bold shadow-lg transition-transform hover:scale-105">
                  Calcular Resultado
                </button>
                </>
             )}
          </section>

          <section className="lg:col-span-3 space-y-8">
            <div className="bg-slate-800/50 rounded-xl p-6 shadow-2xl border border-slate-700 backdrop-blur-sm">
              <h2 className="font-semibold text-xl text-white">
                {view === 'creator' ? '3. Comparar Critérios' : 'Ajuste as Suas Preferências'}
              </h2>
              <div className="mt-4 space-y-2">
                {criteria.map((c1, i) => criteria.slice(i + 1).map((c2, j_offset) => {
                    const j = i + 1 + j_offset;
                    return <ComparisonSlider key={`${i}_${j}`} item1={c1} item2={c2} value={criteriaPairs[`${i}_${j}`] ?? 0} onChange={v => setCriteriaPair(i, j, v)} />;
                }))}
              </div>
              <div className="mt-4 text-sm text-slate-400">
                Consistência (CR): <span className={criteriaConsistency.CR > 0.1 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{(criteriaConsistency.CR * 100).toFixed(1)}%</span>
                {criteriaConsistency.CR > 0.1 && " (Inconsistente, reveja os pesos)"}
              </div>
            </div>

            {view === 'creator' && (
              <div className="bg-slate-800/50 rounded-xl p-6 shadow-2xl border border-slate-700 backdrop-blur-sm">
                  <h2 className="font-semibold text-xl text-white">4. Comparar Alternativas por Critério</h2>
                  <div className="mt-4 space-y-8">
                      {criteria.map((crit, cIdx) => (
                          <div key={cIdx}>
                              <h3 className="font-medium text-lg text-purple-400 border-b border-slate-700 pb-2 mb-4">Em relação a "{crit}":</h3>
                              <div className="space-y-2">
                                  {alternatives.slice(0, -1).map((a1, i) => alternatives.slice(i + 1).map((a2, j_offset) => {
                                      const j = i + 1 + j_offset;
                                      return <ComparisonSlider key={`${i}_${j}`} item1={a1} item2={a2} value={altPairsByCriterion[`c_${cIdx}`]?.[`${i}_${j}`] ?? 0} onChange={v => setAltPair(cIdx, i, j, v)} />;
                                  }))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            )}

            {resultsVisible && view === 'user' && (
              <div className="bg-slate-800/50 rounded-xl p-6 shadow-2xl border border-slate-700 backdrop-blur-sm">
                <h2 className="font-semibold text-2xl text-white">Resultado Final</h2>
                <div className="mt-5 space-y-3">
                  {sortedFinal.map((s, i) => (
                    <div key={s.name} className={`p-4 border-l-4 rounded-r-lg flex items-center justify-between gap-4 transition-all ${i === 0 ? 'bg-green-500/20 border-green-500' : 'bg-slate-700/50 border-slate-600'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white ${i === 0 ? 'bg-green-500' : 'bg-slate-600'}`}>{i + 1}</div>
                        <div className="font-medium text-lg text-white">{s.name}</div>
                      </div>
                      <div className="font-semibold text-xl text-white">{(s.score * 100).toFixed(2)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}