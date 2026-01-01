import { 
  Container, 
  Typography, 
  Box,
  Stack,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContractsControllerGetModuleRelations, useContractsControllerGetModuleDetail } from '../api/generated/contracts/contracts';

function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch module details from Neo4j
  const { 
    data: moduleData, 
    isLoading: isLoadingModule, 
    isError: isErrorModule 
  } = useContractsControllerGetModuleDetail(id || '');

  // Fetch module relations (dependencies) from Neo4j
  const { 
    data: relationsData, 
    isLoading: isLoadingRelations, 
    isError: isErrorRelations 
  } = useContractsControllerGetModuleRelations(id || '');

  const isLoading = isLoadingRelations || isLoadingModule;
  const isError = isErrorRelations || isErrorModule;

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isError || !moduleData) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 3 }}
          >
            Back
          </Button>
          <Alert severity="error">
            {isError ? 'Failed to load module details. Please try again later.' : 'Module not found.'}
          </Alert>
        </Box>
      </Container>
    );
  }

  const parts = moduleData.parts || [];
  const outgoingDependencies = relationsData?.outgoing_dependencies || [];
  const incomingDependencies = relationsData?.incoming_dependencies || [];

  return (
    <Container maxWidth="lg">
      <Box sx={{ minHeight: '100vh', py: 4 }}>
        <Stack spacing={3}>
          {/* Back Button */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>

          {/* Header Section */}
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h4" component="h1">
                    {moduleData.id}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={moduleData.category} color="primary" />
                    <Chip label={moduleData.type} variant="outlined" />
                  </Box>
                </Box>
                
                <Typography variant="body1" color="text.secondary">
                  {moduleData.description}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Parts Section */}
          {parts.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Parts ({parts.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Exportable components of this module
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Part ID</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parts.map((part: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{part.id}</TableCell>
                          <TableCell>
                            <Chip label={part.type} size="small" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Outgoing Dependencies Section */}
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Outgoing Dependencies ({outgoingDependencies.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Modules that this module depends on
              </Typography>
              {outgoingDependencies.length === 0 ? (
                <Alert severity="info">This module has no outgoing dependencies</Alert>
              ) : (
                <Stack spacing={2}>
                  {outgoingDependencies.map((dep, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom
                        component={Link}
                        to={`/contracts/${dep.module_id}`}
                        sx={{ 
                          textDecoration: 'none',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: 'primary.dark'
                          }
                        }}
                      >
                        {dep.module_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Parts used:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {dep.parts.map((part, partIndex) => (
                          <Chip 
                            key={partIndex} 
                            label={`${part.part_id}: ${part.type}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Incoming Dependencies Section */}
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Incoming Dependencies ({incomingDependencies.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Modules that depend on this module
              </Typography>
              {incomingDependencies.length === 0 ? (
                <Alert severity="info">No modules depend on this module</Alert>
              ) : (
                <Stack spacing={2}>
                  {incomingDependencies.map((dep, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom
                        component={Link}
                        to={`/contracts/${dep.module_id}`}
                        sx={{ 
                          textDecoration: 'none',
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: 'primary.dark'
                          }
                        }}
                      >
                        {dep.module_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Parts used from this module:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {dep.parts.map((part, partIndex) => (
                          <Chip 
                            key={partIndex} 
                            label={`${part.part_id}: ${part.type}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Container>
  );
}

export default ContractDetailPage;
