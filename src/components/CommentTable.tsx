'use client';

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Modal,
  Button,
  IconButton
} from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';
import { Comment } from '@/types';

type CommentTableProps = {
  comments: Comment[];
  isLoading: boolean;
};

export default function CommentTable({ comments, isLoading }: CommentTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  const handleOpenModal = (comment: Comment) => {
    setSelectedComment(comment);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedComment(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (comments.length === 0 && !isLoading) {
    return (
      <Typography sx={{ my: 2 }}>
        条件に一致するコメントはありません
      </Typography>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>投稿者</TableCell>
              <TableCell>コメント</TableCell>
              <TableCell>最終返信</TableCell>
              <TableCell>ページ名</TableCell>
              <TableCell>状態</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comments.map((comment) => (
              <TableRow
                key={comment.commentId}
                hover
                onClick={() => handleOpenModal(comment)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <TableCell>{comment.author}</TableCell>
                <TableCell>
                  {comment.content.length > 100
                    ? `${comment.content.substring(0, 100)}...`
                    : comment.content}
                </TableCell>
                <TableCell>{formatDate(comment.lastRepliedAt)}</TableCell>
                <TableCell>{comment.pageTitle}</TableCell>
                <TableCell>{comment.isResolved ? '解決済み' : '未解決'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* コメント詳細モーダル */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="comment-modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '80%', md: '70%' },
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 1,
          overflow: 'auto'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography id="comment-modal-title" variant="h6" component="h2">
              {selectedComment?.pageTitle} / コメント詳細
            </Typography>
            <IconButton onClick={handleCloseModal} aria-label="close">
              <Close />
            </IconButton>
          </Box>
          
          {selectedComment?.thread.map((comment, index) => (
            <Paper key={comment.commentId} sx={{ p: 2, mb: 2, bgcolor: index === 0 ? 'primary.light' : 'background.default' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {comment.author}
              </Typography>
              <Typography variant="body1" sx={{ my: 1, whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(comment.createdAt)}
                </Typography>
                {comment.mentions.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    メンション: {comment.mentions.join(', ')}
                  </Typography>
                )}
              </Box>
            </Paper>
          ))}
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              startIcon={<OpenInNew />}
              component="a"
              href={`https://www.notion.so/${selectedComment?.pageId.replace(/-/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Notionで開く
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
}
