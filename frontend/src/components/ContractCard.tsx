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
}

function ContractCard({ 
  fileName, 
  filePath, 
  id, 
  type, 
  category, 
  description 
}: ContractCardProps) {
  return (
    <Card variant="outlined" data-testid="contract-card">
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              📄 {fileName}
            </Typography>
            {category && (
              <Chip 
                label={category} 
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
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
