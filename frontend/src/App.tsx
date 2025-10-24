import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Box,
  Stack,
  CircularProgress,
  Alert,
  Chip,
  Button
} from '@mui/material'
import { useContractsControllerGetAllContracts } from './api/generated/contracts/contracts'

function App() {
  // Use the generated React Query hook to fetch contracts
  const { data: contracts, isLoading, error } = useContractsControllerGetAllContracts()

  return (
    <Container maxWidth="md">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        py: 4
      }}>
        <Stack spacing={3} alignItems="center" sx={{ width: '100%' }}>
          <Typography 
            variant="h2" 
            component="h1" 
            sx={{
              background: 'linear-gradient(90deg, #646cff 0%, #4cb782 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}
          >
            AI Contracts System
          </Typography>
          
          <Typography variant="h5" color="text.secondary">
            AI Coder Agent Contract Systems
          </Typography>
          
          <Card sx={{ width: '100%', mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Contracts List
              </Typography>
              
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              )}
              
              {error && (
                <Alert severity="error">
                  Error loading contracts: {error instanceof Error ? error.message : 'Unknown error'}
                </Alert>
              )}
              
              {contracts && contracts.length === 0 && (
                <Alert severity="info">
                  No contracts found
                </Alert>
              )}
              
              {contracts && contracts.length > 0 && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {contracts.map((contract, index) => (
                    <Card key={index} variant="outlined" data-testid="contract-card">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          📄 {contract.fileName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Path: {contract.filePath}
                        </Typography>
                        {contract.content && (
                          <Box sx={{ mt: 1 }}>
                            <Chip label={`ID: ${contract.content.id}`} size="small" sx={{ mr: 1 }} />
                            <Chip label={`Type: ${contract.content.type}`} size="small" sx={{ mr: 1 }} />
                            <Chip label={`Category: ${contract.content.category}`} size="small" />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Button
            variant="contained"
            color="primary"
            size="large"
            sx={{ mt: 2 }}
          >
            Verify Contracts
          </Button>
        </Stack>
      </Box>
    </Container>
  )
}

export default App
