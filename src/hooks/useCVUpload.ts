import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export interface CVUploadResponse {
  file_id: number;
  user_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  message: string;
}

export type UploadStatus = 'idle' | 'picking' | 'uploading' | 'success' | 'error';

interface UseCVUploadReturn {
  progress: number;
  status: UploadStatus;
  result: CVUploadResponse | null;
  error: string | null;
  cvs: CVListItem[];
  isLoadingCVs: boolean;
  pickFile: () => void;
  uploadFile: (file: File) => void;
  fetchCVList: () => Promise<void>;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';
const FETCH_TIMEOUT_MS = 30000;
const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ACCEPTED_EXTENSIONS = '.pdf,.docx';

export interface CVListItem {
  id: number;
  file_name: string;
  file_path: string;
  analyzed_at: string | null;
  score: number | null;
  created_at: string;
}

export interface CVListResponse {
  cvs: CVListItem[];
}

export function useCVUpload(userId: number | undefined): UseCVUploadReturn {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [result, setResult] = useState<CVUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cvs, setCvs] = useState<CVListItem[]>([]);
  const [isLoadingCVs, setIsLoadingCVs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickFile = useCallback(async () => {
    if (!userId) {
      setError('User not authenticated');
      setStatus('error');
      return;
    }

    setStatus('picking');
    setError(null);
    setResult(null);

    if (Platform.OS === 'web') {
      if (!fileInputRef.current) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = ACCEPTED_EXTENSIONS;
        input.style.display = 'none';
        input.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (file) {
            uploadFile(file);
          } else {
            setStatus('idle');
          }
        };
        fileInputRef.current = input;
        document.body.appendChild(input);
      }
      fileInputRef.current.click();
    } else {
      try {
        const picked = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          copyTo: 'cachesDirectory',
        });

        if (picked.canceled) {
          setStatus('idle');
          return;
        }

        const asset = picked.assets[0];
        if (!asset) {
          setError('No file selected');
          setStatus('error');
          return;
        }

        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const file = new File([blob], asset.name, { type: asset.mimeType || 'application/pdf' });
        uploadFile(file);
      } catch (err) {
        setError('Failed to pick file');
        setStatus('error');
      }
    }
  }, [userId]);

  const uploadFile = useCallback((file: File) => {
    if (!userId) {
      setError('User not authenticated');
      setStatus('error');
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('僅支援 PDF 或 DOCX 檔案');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as CVUploadResponse;
          setResult(response);
          setStatus('success');
          setProgress(100);
        } catch {
          setError('解析回應失敗');
          setStatus('error');
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          setError(errorResponse.detail || '上傳失敗');
        } catch {
          setError('上傳失敗');
        }
        setStatus('error');
      }
    };

    xhr.onerror = () => {
      setError('網絡錯誤');
      setStatus('error');
    };

    xhr.open('POST', `${API_BASE_URL}/cvs/upload?user_id=${userId}`);
    xhr.send(formData);
  }, [userId]);

  const fetchCVList = useCallback(async () => {
    if (!userId) return;
    setIsLoadingCVs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cvs/?user_id=${userId}`);
      if (response.ok) {
        const data: CVListResponse = await response.json();
        setCvs(data.cvs);
      }
    } catch {
      // silent fail on list load
    } finally {
      setIsLoadingCVs(false);
    }
  }, [userId]);

  return {
    progress,
    status,
    result,
    error,
    cvs,
    isLoadingCVs,
    pickFile,
    uploadFile,
    fetchCVList,
  };
}