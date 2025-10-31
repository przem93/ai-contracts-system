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
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { useContractsControllerValidateContracts } from '../api/generated/contracts/contracts';
import { ValidationResponseDto } from '../api/generated/model';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function ValidationPage() {
  // Use the generated React Query hook to fetch validation results
  const { data, isLoading, error } = useContractsControllerValidateContracts<ValidationResponseDto>();

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
              Contract Validation
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review validation results for all contract files
            </Typography>
          </Box>
          
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
          
          {error && (
            <Alert severity="error">
              Error loading validation results: {error instanceof Error ? error.message : 'Unknown error'}
            </Alert>
          )}
          
          {data && (
            <>
              {/* Overall validation status */}
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {data.valid ? (
                      <>
                        <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                        <Box>
                          <Typography variant="h6">All Contracts Valid</Typography>
                          <Typography variant="body2" color="text.secondary">
                            All {data.files.length} contract files passed validation
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <>
                        <ErrorIcon color="error" sx={{ fontSize: 40 }} />
                        <Box>
                          <Typography variant="h6">Validation Errors Found</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {data.files.filter(f => !f.valid).length} of {data.files.length} contracts have errors
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Individual contract validation results */}
              <Stack spacing={2}>
                {data.files.map((file, index) => (
                  <Card 
                    key={index} 
                    variant="outlined"
                    sx={{
                      borderColor: file.valid ? 'success.main' : 'error.main',
                      borderWidth: 2
                    }}
                    data-testid="contract-card"
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {file.valid ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <ErrorIcon color="error" />
                            )}
                            <Typography variant="h6">
                              {file.fileName}
                            </Typography>
                          </Box>
                          <Chip 
                            label={file.valid ? 'Valid' : 'Invalid'} 
                            color={file.valid ? 'success' : 'error'}
                            size="small"
                          />
                        </Stack>
                        
                        <Typography variant="body2" color="text.secondary">
                          Path: {file.filePath}
                        </Typography>

                        {!file.valid && file.errors && file.errors.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" color="error" gutterBottom>
                              Validation Errors:
                            </Typography>
                            <List dense>
                              {file.errors.map((error, errorIndex) => (
                                <ListItem 
                                  key={errorIndex}
                                  sx={{ 
                                    bgcolor: 'error.light',
                                    borderRadius: 1,
                                    mb: 1,
                                    pl: 2
                                  }}
                                >
                                  <ListItemText
                                    primary={error.message}
                                    secondary={`Path: ${error.path}`}
                                    primaryTypographyProps={{
                                      variant: 'body2',
                                      color: 'white'
                                    }}
                                    secondaryTypographyProps={{
                                      variant: 'caption',
                                      color: 'white'
                                    }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}

                        {file.valid && (
                          <Alert severity="success" sx={{ mt: 1 }}>
                            Contract passed all validation checks
                          </Alert>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              {data.files.length === 0 && (
                <Alert severity="info">
                  No contract files found to validate
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Box>
    </Container>
  );
}

export default ValidationPage;
