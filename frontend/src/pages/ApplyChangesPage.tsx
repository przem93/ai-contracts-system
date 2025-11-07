import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Box,
  Stack,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useContractsControllerApplyContracts } from '../api/generated/contracts/contracts';
import { useEffect } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function ApplyChangesPage() {
  const navigate = useNavigate();
  const { mutate, data, isPending, error, isSuccess, isError } = useContractsControllerApplyContracts();

  // Automatically trigger the apply operation when the page loads
  useEffect(() => {
    mutate();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        minHeight: '100vh', 
        py: 4
      }}>
        <Stack spacing={3}>
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom
              sx={{ fontWeight: 'bold' }}
            >
              Apply Contract Changes
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Applying validated contracts to the Neo4j database
            </Typography>
          </Box>
          
          {isPending && (
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress size={60} />
                  <Typography variant="h6">
                    Applying changes to database...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please wait while we update the database with your contracts
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}
          
          {isSuccess && data && (
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <CheckCircleIcon color="success" sx={{ fontSize: 60 }} data-testid="CheckCircleIcon" />
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        Changes Applied Successfully!
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {data.message}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1, color: 'white' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Summary:
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        Modules processed: <strong>{data.modulesProcessed}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Parts processed: <strong>{data.partsProcessed}</strong>
                      </Typography>
                    </Stack>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', pt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={() => navigate('/')}
                    >
                      Return to Contracts List
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
          
          {isError && (
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <ErrorIcon color="error" sx={{ fontSize: 60 }} data-testid="ErrorIcon" />
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        Failed to Apply Changes
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        An error occurred while applying the contracts to the database
                      </Typography>
                    </Box>
                  </Stack>

                  <Alert severity="error">
                    <Typography variant="body2">
                      <strong>Error Details:</strong>
                    </Typography>
                    <Typography variant="body2">
                      {error instanceof Error ? error.message : 'Unknown error occurred'}
                    </Typography>
                  </Alert>

                  <Box sx={{ bgcolor: 'error.light', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'white' }}>
                      What to do next:
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        ? Verify that all contracts pass validation
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        ? Check that the Neo4j database is running and accessible
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        ? Review the error message for specific issues
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        ? Try again or contact support if the issue persists
                      </Typography>
                    </Stack>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', pt: 2 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={() => navigate('/validation')}
                    >
                      Back to Validation
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={() => {
                        // Trigger the mutation again
                        mutate();
                      }}
                      data-testid="try-again-button"
                    >
                      Try Again
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Box>
    </Container>
  );
}

export default ApplyChangesPage;
