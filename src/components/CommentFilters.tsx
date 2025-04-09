'use client';

import { Box, Typography, CircularProgress, Slider, FormControlLabel, Switch } from '@mui/material';

type FilterProps = {
  showUnresolvedOnly: boolean;
  setShowUnresolvedOnly: (value: boolean) => void;
  showNoReplyDays: number;
  setShowNoReplyDays: (value: number) => void;
  showMentionsOnly: boolean;
  setShowMentionsOnly: (value: boolean) => void;
  showParticipatingOnly: boolean;
  setShowParticipatingOnly: (value: boolean) => void;
  isLoading: boolean;
};

export default function CommentFilters({
  showUnresolvedOnly,
  setShowUnresolvedOnly,
  showNoReplyDays,
  setShowNoReplyDays,
  showMentionsOnly,
  setShowMentionsOnly,
  showParticipatingOnly,
  setShowParticipatingOnly,
  isLoading
}: FilterProps) {
  const handleDaysChange = (_event: Event, newValue: number | number[]) => {
    setShowNoReplyDays(newValue as number);
  };

  return (
    <Box sx={{ p: 2, mb: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
      <Typography variant="h6" gutterBottom>
        フィルター
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showUnresolvedOnly}
              onChange={(e) => setShowUnresolvedOnly(e.target.checked)}
              disabled={isLoading}
            />
          }
          label="未解決のみ"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={showMentionsOnly}
              onChange={(e) => setShowMentionsOnly(e.target.checked)}
              disabled={isLoading}
            />
          }
          label="自分宛のみ"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={showParticipatingOnly}
              onChange={(e) => setShowParticipatingOnly(e.target.checked)}
              disabled={isLoading}
            />
          }
          label="自分が参加しているスレッドのみ"
        />
      </Box>
      
      <Box sx={{ mt: 3, px: 2 }}>
        <Typography id="days-slider" gutterBottom>
          返信がない日数: {showNoReplyDays}日以上
        </Typography>
        <Slider
          value={showNoReplyDays}
          onChange={handleDaysChange}
          aria-labelledby="days-slider"
          valueLabelDisplay="auto"
          step={1}
          marks
          min={0}
          max={30}
          disabled={isLoading}
        />
      </Box>
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 1 }}>
            フィルターを適用中...
          </Typography>
        </Box>
      )}
    </Box>
  );
}
