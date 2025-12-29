import {
  Card,
  CardContent,
  Box,
  Stack,
  Typography,
  Chip
} from '@mui/material';

export interface ContractCardProps {
  fileName: string;
  filePath: string;
  id?: string;
  type?: string;
  category?: string;
  description?: string;
  status?: 'modified' | 'added' | 'removed';
  onClick?: () => void;
  clickable?: boolean;
}

function ContractCard({ 
  fileName, 
  filePath, 
  id, 
  type, 
  category, 
  description,
  status,
  onClick,
  clickable = false
}: ContractCardProps) {
  // Map status to chip color and label
  const getStatusChip = () => {
    if (!status) return null;
    
    const statusConfig = {
      added: { color: 'success' as const, label: '✨ New', icon: '✨' },
      modified: { color: 'warning' as const, label: '🔄 Modified', icon: '🔄' },
      removed: { color: 'error' as const, label: '🗑️ Removed', icon: '🗑️' }
    };
    
    const config = statusConfig[status];
    return (
      <Chip 
        label={config.label}
        size="small"
        color={config.color}
        sx={{ fontWeight: 600 }}
      />
    );
  };

  return (
    <Card 
      variant="outlined" 
      data-testid="contract-card"
      onClick={clickable && onClick ? onClick : undefined}
      sx={{
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': clickable ? {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        } : {}
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6">
              📄 {fileName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {getStatusChip()}
              {category && (
                <Chip 
                  label={category} 
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Path: {filePath}
          </Typography>

          {description && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                Description:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            {id && <Chip label={`ID: ${id}`} size="small" />}
            {type && <Chip label={`Type: ${type}`} size="small" />}
            {!description && category && <Chip label={`Category: ${category}`} size="small" />}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ContractCard;
