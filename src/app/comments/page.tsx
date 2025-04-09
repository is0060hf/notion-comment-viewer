'use client';

import { useState, useEffect, Suspense } from 'react';
import { Box, Container, Typography, AppBar, Toolbar, CircularProgress } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import CommentFilters from '@/components/CommentFilters';
import CommentTable from '@/components/CommentTable';
import AuthButton from '@/components/AuthButton';
import Link from 'next/link';
import { Comment } from '@/types';

function CommentsContent() {
  const searchParams = useSearchParams();
  const pageId = searchParams.get('pageId');
  const pageTitle = searchParams.get('pageTitle');
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // フィルター状態
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(true);
  const [showNoReplyDays, setShowNoReplyDays] = useState(3);
  const [showMentionsOnly, setShowMentionsOnly] = useState(false);
  const [showParticipatingOnly, setShowParticipatingOnly] = useState(false);

  useEffect(() => {
    if (!pageId) {
      setError('ページIDが指定されていません');
      setLoading(false);
      return;
    }
    
    fetchComments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, showUnresolvedOnly, showNoReplyDays, showMentionsOnly, showParticipatingOnly]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        rootPageId: pageId as string,
        filterUnresolved: showUnresolvedOnly.toString(),
        filterNoReplyDays: showNoReplyDays.toString(),
        filterMyComments: (showMentionsOnly || showParticipatingOnly).toString()
      });
      
      const response = await fetch(`/api/notion/comments?${queryParams}`);
      if (!response.ok) {
        throw new Error('コメントの取得に失敗しました');
      }
      
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('コメント取得エラー:', error);
      setError('コメントの取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {pageTitle || 'ページ'} のコメント
        </Typography>
        
        <CommentFilters 
          showUnresolvedOnly={showUnresolvedOnly}
          setShowUnresolvedOnly={setShowUnresolvedOnly}
          showNoReplyDays={showNoReplyDays}
          setShowNoReplyDays={setShowNoReplyDays}
          showMentionsOnly={showMentionsOnly}
          setShowMentionsOnly={setShowMentionsOnly}
          showParticipatingOnly={showParticipatingOnly}
          setShowParticipatingOnly={setShowParticipatingOnly}
          isLoading={loading}
        />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ my: 2 }}>
            {error}
          </Typography>
        ) : (
          <CommentTable comments={comments} isLoading={loading} />
        )}
      </Box>
    </>
  );
}

export default function CommentsPage() {
  return (
    <>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Typography variant="h6" component="div">
                Notion コメント管理
              </Typography>
            </Link>
          </Box>
          <AuthButton />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        }>
          <CommentsContent />
        </Suspense>
      </Container>
    </>
  );
}
