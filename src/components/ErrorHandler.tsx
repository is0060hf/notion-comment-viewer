'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useSession } from 'next-auth/react';

type ErrorHandlerProps = {
  children: React.ReactNode;
};

export default function ErrorHandler({ children }: ErrorHandlerProps) {
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // グローバルなエラーハンドリング
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('グローバルエラー:', event.error);
      setError('予期しないエラーが発生しました。ページを再読み込みしてください。');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Promise拒否:', event.reason);
      setError('APIリクエスト中にエラーが発生しました。ネットワーク接続を確認してください。');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // 認証状態の監視
  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [status]);

  return (
    <>
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ 
            position: 'fixed', 
            top: 16, 
            right: 16, 
            zIndex: 9999,
            maxWidth: '80%'
          }}
        >
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box 
          sx={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 9998
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              読み込み中...
            </Typography>
          </Box>
        </Box>
      )}
      
      {children}
    </>
  );
}
