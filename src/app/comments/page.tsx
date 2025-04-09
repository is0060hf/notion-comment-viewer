'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Box, Container, Typography, AppBar, Toolbar, CircularProgress, Alert, Button, Modal, IconButton, Paper, List, ListItem, ListItemText, Divider, Link as MuiLink } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import CommentFilters from '@/components/CommentFilters';
import CommentTable from '@/components/CommentTable';
import AuthButton from '@/components/AuthButton';
import Link from 'next/link';
import { Comment } from '@/types';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LaunchIcon from '@mui/icons-material/Launch';

function DiagnoseModal({ open, onClose, pageId }: { open: boolean; onClose: () => void; pageId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const runDiagnostics = async () => {
    if (!pageId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/notion/diagnose?pageId=${pageId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '診断中にエラーが発生しました');
      }
      
      setDiagnosis(data.diagnosis);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診断中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && pageId) {
      runDiagnostics();
    }
  }, [open, pageId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openNotionPage = () => {
    if (diagnosis?.cleanId) {
      const notionUrl = `https://www.notion.so/${diagnosis.cleanId.replace(/-/g, '')}`;
      window.open(notionUrl, '_blank');
    } else {
      const notionUrl = `https://www.notion.so/${pageId.replace(/-/g, '')}`;
      window.open(notionUrl, '_blank');
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: { xs: '90%', sm: '80%', md: '60%' },
        maxHeight: '80vh',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 1,
        overflow: 'auto'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
            <BuildIcon sx={{ mr: 1 }} />
            Notionページ診断
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="body1" paragraph>
          このツールはNotionページへのアクセス問題を診断し、解決策を提案します。
        </Typography>

        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            診断対象：
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              ページID:
            </Typography>
            <Typography 
              variant="body2" 
              component="code" 
              sx={{ 
                bgcolor: 'grey.100', 
                p: 0.5, 
                borderRadius: 1,
                fontFamily: 'monospace',
                flexGrow: 1,
                overflow: 'auto'
              }}
            >
              {pageId}
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => copyToClipboard(pageId)}
              title="IDをコピー"
              color={copied ? "success" : "default"}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
          {diagnosis?.notionUrl && (
            <Button
              variant="outlined"
              size="small"
              onClick={openNotionPage}
              sx={{ mt: 2 }}
              startIcon={<LaunchIcon />}
            >
              Notionで開く
            </Button>
          )}
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : diagnosis ? (
          <>
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                診断結果:
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mr: 1 }}>
                  アクセス状態:
                </Typography>
                {diagnosis.access ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                    <CheckCircleIcon sx={{ mr: 0.5 }} fontSize="small" />
                    <Typography variant="body1">アクセス可能</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                    <ErrorIcon sx={{ mr: 0.5 }} fontSize="small" />
                    <Typography variant="body1">アクセス不可</Typography>
                  </Box>
                )}
              </Box>
              
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>ページタイプ:</strong> {diagnosis.type}
              </Typography>
              
              {diagnosis.parentType && (
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>親タイプ:</strong> {diagnosis.parentType}
                </Typography>
              )}
              
              {diagnosis.parentId && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body1" sx={{ mr: 1 }}>
                    <strong>親ID:</strong>
                  </Typography>
                  <Typography 
                    variant="body2" 
                    component="code" 
                    sx={{ 
                      bgcolor: 'grey.100', 
                      p: 0.5, 
                      borderRadius: 1,
                      fontFamily: 'monospace'
                    }}
                  >
                    {diagnosis.parentId}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(diagnosis.parentId)}
                    title="親IDをコピー"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              
              {diagnosis.title && (
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>タイトル:</strong> {diagnosis.title}
                </Typography>
              )}
              
              {diagnosis.error && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>エラー:</strong> {diagnosis.error}
                </Alert>
              )}
            </Paper>
            
            <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                推奨アクション:
              </Typography>
              
              <List>
                {recommendations.map((rec, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText primary={rec} />
                    </ListItem>
                    {index < recommendations.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  <Typography variant="body2">
                    Notionでは、データベースとその中のレコード（ページ）両方にアクセス権を付与する必要があります。
                    特にデータベースの場合は、データベース自体と各レコード両方へのアクセス権が必要です。
                  </Typography>
                </Alert>
              </Box>
            </Paper>
          </>
        ) : null}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={runDiagnostics} 
            disabled={loading}
            startIcon={<BuildIcon />}
          >
            再診断
          </Button>
          <Button 
            variant="contained" 
            onClick={onClose}
          >
            閉じる
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

function NotionHelpModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: { xs: '90%', sm: '80%', md: '60%' },
        maxHeight: '80vh',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 1,
        overflow: 'auto'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Notionインテグレーションの設定方法
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          問題：アクセス権限エラー
        </Typography>
        <Typography variant="body1" paragraph>
          「一部のページへのアクセス権限がありません」というエラーが表示される場合、NotionのAPIインテグレーションにページへのアクセス権限がありません。
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          解決方法：
        </Typography>
        <Box component="ol" sx={{ pl: 2 }}>
          <Box component="li" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              Notionページを開く
            </Typography>
            <Typography variant="body2">
              コメントを表示したいページをNotionで開きます。
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              共有ボタンをクリック
            </Typography>
            <Typography variant="body2">
              ページ右上の「共有」ボタンをクリックします。
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              インテグレーションを追加
            </Typography>
            <Typography variant="body2">
              「インテグレーションを招待」セクションで、このアプリで使用しているNotionインテグレーション名を検索して選択します。
              通常は「Notion Comment Viewer」または管理者が設定した名前です。
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
              重要: 「ページのコンテンツへのアクセス」権限が付与されていることを確認してください。
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              データベースの場合の追加手順
            </Typography>
            <Typography variant="body2">
              データベースページの場合、データベース自体とそのすべてのエントリ（レコード）にも同じ手順でアクセス権を付与してください。
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                データベースレコードからコメントを表示したい場合は、「診断」ツールを使用すると、親データベースのIDが表示されます。そのデータベースにもアクセス権を付与する必要があります。
              </Typography>
            </Alert>
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          重要ポイント：
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <Box component="li">
            <Typography variant="body2">
              権限の反映には数分かかる場合があります。
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">
              データベースとその中のすべてのページに権限を付与する必要があります。
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">
              企業のNotionワークスペースでは、管理者に権限付与の依頼が必要な場合があります。
            </Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">
              ブロックされたページやデータベースは、それらを含むページからも共有する必要があります。
            </Typography>
          </Box>
        </Box>
        
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            Notionの仕様上、データベースのレコード（ページ）のコメントを取得するには、データベース自体とそのレコードの両方にアクセス権が必要です。どちらか一方だけではコメントを取得できません。
          </Typography>
        </Alert>
        
        <Button 
          variant="contained" 
          onClick={onClose} 
          sx={{ mt: 4, display: 'block', mx: 'auto' }}
        >
          閉じる
        </Button>
      </Box>
    </Modal>
  );
}

function CommentsContent() {
  const searchParams = useSearchParams();
  const pageId = searchParams.get('pageId');
  const pageTitle = searchParams.get('pageTitle');
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [permissionIssues, setPermissionIssues] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [diagnoseModalOpen, setDiagnoseModalOpen] = useState(false);
  const [isDatabase, setIsDatabase] = useState(false);
  const [databaseName, setDatabaseName] = useState('');
  
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
    setError('');
    setWarning('');
    setPermissionIssues(false);
    setIsDatabase(false);
    setDatabaseName('');
    
    try {
      const queryParams = new URLSearchParams({
        rootPageId: pageId as string,
        filterUnresolved: showUnresolvedOnly.toString(),
        filterNoReplyDays: showNoReplyDays.toString(),
        filterMyComments: (showMentionsOnly || showParticipatingOnly).toString()
      });
      
      const response = await fetch(`/api/notion/comments?${queryParams}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'コメントの取得に失敗しました');
      }
      
      setComments(data.comments || []);
      
      // データベース情報があれば設定
      if (data.isDatabase) {
        setIsDatabase(true);
        setDatabaseName(data.databaseName || '');
      }
      
      // 警告メッセージがある場合は表示
      if (data.warning) {
        setWarning(data.warning);
      }
      
      // アクセス権限の問題を検出
      if (data.hasPermissionIssues) {
        setPermissionIssues(true);
      }
    } catch (error) {
      console.error('コメント取得エラー:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('コメントの取得中にエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {isDatabase ? (
            <>
              データベース「{databaseName}」のコメント
              <Typography variant="subtitle1" color="text.secondary">
                データベース自体とその中のレコードのコメントを表示しています
              </Typography>
            </>
          ) : (
            <>
              {pageTitle || 'ページ'} のコメント
            </>
          )}
        </Typography>
        
        {permissionIssues && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Box>
                <Button 
                  color="inherit" 
                  size="small" 
                  startIcon={<HelpOutlineIcon />}
                  onClick={() => setHelpModalOpen(true)}
                  sx={{ mr: 1 }}
                >
                  ヘルプ
                </Button>
                <Button 
                  color="inherit" 
                  size="small" 
                  startIcon={<BuildIcon />}
                  onClick={() => setDiagnoseModalOpen(true)}
                >
                  診断
                </Button>
              </Box>
            }
          >
            <Typography variant="body1">
              一部のページへのアクセス権限がありません。Notionインテグレーションと該当ページが共有されているか確認してください。
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Notionの管理画面で、表示したいページをインテグレーションと共有してください。
              方法: ページを開く → 右上の「共有」ボタン → インテグレーション名を検索して追加
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
                問題のページID:
              </Typography>
              <Typography 
                variant="body2" 
                component="code" 
                sx={{ 
                  bgcolor: 'grey.100', 
                  p: 0.5, 
                  borderRadius: 1,
                  fontFamily: 'monospace'
                }}
              >
                {pageId}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => {
                  navigator.clipboard.writeText(pageId || '');
                }}
                sx={{ ml: 1 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Alert>
        )}
        
        {warning && !permissionIssues && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {warning}
          </Alert>
        )}
        
        {isDatabase && !permissionIssues && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body1">
              <strong>データベースモード:</strong> このデータベース内のすべてのレコード（ページ）のコメントを表示しています。
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              各コメントは「データベース名 &gt; レコード名」の形式で表示されます。
            </Typography>
          </Alert>
        )}
        
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
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : (
          <CommentTable comments={comments} isLoading={loading} />
        )}
      </Box>
      
      <NotionHelpModal open={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
      {pageId && (
        <DiagnoseModal 
          open={diagnoseModalOpen} 
          onClose={() => setDiagnoseModalOpen(false)}
          pageId={pageId}
        />
      )}
    </>
  );
}

export default function CommentsPage() {
  const [globalHelpModalOpen, setGlobalHelpModalOpen] = useState(false);
  
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
          <IconButton 
            color="inherit" 
            onClick={() => setGlobalHelpModalOpen(true)} 
            sx={{ mr: 1 }}
            aria-label="ヘルプ"
          >
            <HelpOutlineIcon />
          </IconButton>
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
      
      <NotionHelpModal open={globalHelpModalOpen} onClose={() => setGlobalHelpModalOpen(false)} />
    </>
  );
}
