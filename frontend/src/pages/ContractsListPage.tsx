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
import { 
  useContractsControllerGetAllContracts,
  useContractsControllerCheckIfContractsModified 
} from '../api/generated/contracts/contracts';
import ContractCard from '../components/ContractCard';

function ContractsListPage() {
  const navigate = useNavigate();
  // Use the generated React Query hook to fetch contracts
  const { data: contracts, isLoading, error } = useContractsControllerGetAllContracts();
  
  // Check if contracts have been modified
  const { 
    data: checkModifiedData, 
    isLoading: isCheckingModified, 
    error: checkModifiedError 
  } = useContractsControllerCheckIfContractsModified();

  // Filter contracts to show only modified/new ones
  const modifiedContracts = contracts?.filter(contract => {
    if (!checkModifiedData?.changes) return false;
    return checkModifiedData.changes.some(change => 
      change.filePath === contract.filePath
    );
  }) || [];

  // Get the status for a contract
  const getContractStatus = (filePath: string): 'modified' | 'added' | 'removed' | undefined => {
    const change = checkModifiedData?.changes?.find(c => c.filePath === filePath);
    return change?.status;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
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
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            AI Contracts System
          </Typography>
          
          <Typography variant="h5" color="text.secondary" sx={{ textAlign: 'center' }}>
            AI Coder Agent Contract Systems
          </Typography>
          
          <Card sx={{ width: '100%', mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Modified/New Contracts
              </Typography>
              
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error">
                  Error loading contracts: {error instanceof Error ? error.message : 'Unknown error'}
                </Alert>
              ) : modifiedContracts.length === 0 && !isCheckingModified ? (
                <Alert severity="info">
                  No modified or new contracts found. All contracts are up to date with the database.
                </Alert>
              ) : modifiedContracts.length > 0 ? (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {modifiedContracts.map((contract, index) => (
                    <ContractCard
                      key={index}
                      fileName={contract.fileName}
                      filePath={contract.filePath}
                      id={contract.content?.id as string}
                      type={contract.content?.type as string}
                      category={contract.content?.category as string}
                      status={getContractStatus(contract.filePath)}
                    />
                  ))}
                </Stack>
              ) : null}
            </CardContent>
          </Card>

          {checkModifiedError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Error checking contract modifications: {(checkModifiedError as Error)?.message || 'Unknown error'}
            </Alert>
          )}

          {checkModifiedData && !checkModifiedData.hasChanges && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No changes detected. All contracts are up to date with the database.
            </Alert>
          )}

          <Button
            variant="contained"
            color="primary"
            size="large"
            sx={{ mt: 2 }}
            onClick={() => navigate('/validation')}
            disabled={isCheckingModified || !checkModifiedData?.hasChanges}
            data-testid="verify-contracts-button"
          >
            {isCheckingModified ? 'Checking for changes...' : 'Verify Contracts'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}

export default ContractsListPage;
