import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Box,
  Stack,
  TextField,
  InputAdornment,
  Chip,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';

// Mock data for search results
const mockContracts = [
  {
    id: 'users-get',
    type: 'controller',
    category: 'api',
    description: 'Users get endpoint - retrieves user information from the database',
    fileName: 'users-get.yml',
    filePath: '/contracts/users-get.yml'
  },
  {
    id: 'users-permissions',
    type: 'service',
    category: 'service',
    description: 'Users permissions service - manages user authorization and access control',
    fileName: 'users-permissions.yml',
    filePath: '/contracts/users-permissions.yml'
  },
  {
    id: 'auth-controller',
    type: 'controller',
    category: 'api',
    description: 'Authentication controller - handles user login and authentication flow',
    fileName: 'auth-controller.yml',
    filePath: '/contracts/auth-controller.yml'
  },
  {
    id: 'user-profile',
    type: 'component',
    category: 'frontend',
    description: 'User profile component - displays user information and settings',
    fileName: 'user-profile.yml',
    filePath: '/contracts/user-profile.yml'
  },
  {
    id: 'database-service',
    type: 'service',
    category: 'service',
    description: 'Database service - provides database connection and query execution',
    fileName: 'database-service.yml',
    filePath: '/contracts/database-service.yml'
  }
];

function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter contracts based on search query (case-insensitive)
  const filteredContracts = mockContracts.filter(contract => 
    contract.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Search Contracts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Search contracts by description
            </Typography>
          </Box>
          
          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
              }
            }}
          />

          {/* Search Results */}
          {searchQuery === '' ? (
            <Alert severity="info">
              Start typing to search contracts by description
            </Alert>
          ) : filteredContracts.length === 0 ? (
            <Alert severity="warning">
              No contracts found matching "{searchQuery}"
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Found {filteredContracts.length} {filteredContracts.length === 1 ? 'contract' : 'contracts'}
              </Typography>
              <Stack spacing={2}>
                {filteredContracts.map((contract) => (
                  <Card key={contract.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h6">
                            📄 {contract.fileName}
                          </Typography>
                          <Chip 
                            label={contract.category} 
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary">
                          Path: {contract.filePath}
                        </Typography>

                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                            Description:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {contract.description}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip label={`ID: ${contract.id}`} size="small" />
                          <Chip label={`Type: ${contract.type}`} size="small" />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </Box>
    </Container>
  );
}

export default SearchPage;
