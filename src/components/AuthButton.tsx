'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { Button, Box, Avatar, Typography, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import { Login, Logout } from '@mui/icons-material';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = () => {
    handleClose();
    signOut();
  };

  if (status === 'loading') {
    return (
      <Button variant="outlined" disabled>
        読み込み中...
      </Button>
    );
  }

  if (session) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button
          onClick={handleClick}
          startIcon={
            session.user?.image ? (
              <Avatar
                src={session.user.image}
                alt={session.user.name || ''}
                sx={{ width: 24, height: 24 }}
              />
            ) : null
          }
        >
          {session.user?.name || 'ユーザー'}
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'user-menu-button',
          }}
        >
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              {session.user?.email}
            </Typography>
          </MenuItem>
          <MenuItem onClick={handleSignOut}>
            <Logout fontSize="small" sx={{ mr: 1 }} />
            ログアウト
          </MenuItem>
        </Menu>
      </Box>
    );
  }

  return (
    <Button
      variant="contained"
      onClick={() => signIn('notion')}
      startIcon={<Login />}
    >
      Notionでログイン
    </Button>
  );
}
