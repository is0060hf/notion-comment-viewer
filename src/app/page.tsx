'use client';

import { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  CircularProgress, 
  AppBar, 
  Toolbar,
  Paper,
  Button
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import AuthButton from '@/components/AuthButton';
import { useSession } from 'next-auth/react';
import { NotionPage } from '@/types';

export default function Home() {
  const { status } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NotionPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/notion/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('検索に失敗しました');
      }
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('検索エラー:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  const handleSearchButtonClick = () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    handleSearch(searchQuery);
  };

  const handleSelectPage = (pageId: string, pageTitle: string) => {
    window.location.href = `/comments?pageId=${pageId}&pageTitle=${encodeURIComponent(pageTitle)}`;
  };

  return (
    <>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              Notion コメント管理
            </Typography>
          </Box>
          <AuthButton />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md">
        <Box sx={{ my: 8, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Notion コメント管理
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
            未解決のコメントや返信のないコメントを簡単に確認できます
          </Typography>
          
          {status === 'authenticated' ? (
            <Paper elevation={2} sx={{ p: 4, maxWidth: '600px', mx: 'auto' }}>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Notionページを検索"
                  variant="outlined"
                  value={searchQuery}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: isLoading ? (
                      <InputAdornment position="end">
                        <CircularProgress size={24} />
                      </InputAdornment>
                    ) : null,
                  }}
                />
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSearchButtonClick}
                    disabled={isLoading || searchQuery.length < 2}
                    startIcon={<SearchIcon />}
                  >
                    検索
                  </Button>
                </Box>
              </Box>
              
              {searchResults.length > 0 && (
                <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
                  {searchResults.map((page) => (
                    <ListItem 
                      key={page.id} 
                      onClick={() => handleSelectPage(page.id, page.title)}
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'action.hover' 
                        },
                        cursor: 'pointer'
                      }}
                    >
                      <ListItemText primary={page.title} secondary={page.url} />
                    </ListItem>
                  ))}
                </List>
              )}
              
              {searchQuery.length >= 2 && searchResults.length === 0 && !isLoading && (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  検索結果がありません
                </Typography>
              )}
            </Paper>
          ) : status === 'loading' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper elevation={2} sx={{ p: 4, maxWidth: '600px', mx: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Notionアカウントでログインしてください
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                コメントを確認するには、Notionアカウントでログインする必要があります。
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <AuthButton />
              </Box>
            </Paper>
          )}
        </Box>
      </Container>
    </>
  );
}
