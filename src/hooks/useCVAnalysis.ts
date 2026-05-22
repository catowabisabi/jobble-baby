import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

export interface CVAnalysisResult {
  cv_id: number;
  score: number;
  breakdown: {
    role_relevance: number;
    experience_years: number;
    education_quality: number;
    skills_clarity: number;
    quantified_achievements: number;
    overall_professionalism: number;
  };
  role_relevance: number;
  experience_years: number;
  education_quality: number;
  skills_clarity: number;
  quantified_achievements: number;
  overall_professionalism: number;
  text_suggestions: string[];
}

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseCVAnalysisReturn {
  analysis: CVAnalysisResult | null;
  status: AnalysisStatus;
  error: string | null;
  refetch: () => void;
}

export function useCVAnalysis(cvId: number | null): UseCVAnalysisReturn {
  const [analysis, setAnalysis] = useState<CVAnalysisResult | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!cvId) return;
    
    setStatus('loading');
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${API_BASE_URL}/cvs/score?cv_id=${cvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }
      
      const data: CVAnalysisResult = await response.json();
      setAnalysis(data);
      setStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
      setStatus('error');
    }
  }, [cvId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return { analysis, status, error, refetch: fetchAnalysis };
}