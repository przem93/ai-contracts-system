import { 
  Container, 
  Typography, 
  Box,
  Stack,
  TextField,
  InputAdornment,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useState } from 'react';
import ContractCard from '../components/ContractCard';

// Mock categories
const mockCategories = [
  { value: 'all', label: 'All Categories' },
  { value: 'api', label: 'API' },
  { value: 'service', label: 'Service' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'component', label: 'Component' }
];

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
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setSelectedCategory(event.target.value);
  };

  // Filter contracts based on search query and category (case-insensitive)
  const filteredContracts = mockContracts.filter(contract => {
    const matchesSearch = contract.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || contract.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
              Search contracts by description and filter by category
            </Typography>
          </Box>
          
          {/* Search and Filter Controls */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexDirection: { xs: 'column', md: 'row' },
            width: '100%'
          }}>
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

            {/* Category Select */}
            <FormControl 
              sx={{ 
                minWidth: { xs: '100%', md: 240 },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                }
              }}
            >
              <InputLabel id="category-select-label">Category</InputLabel>
              <Select
                labelId="category-select-label"
                id="category-select"
                value={selectedCategory}
                label="Category"
                onChange={handleCategoryChange}
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListIcon />
                  </InputAdornment>
                }
              >
                {mockCategories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

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
                  <ContractCard
                    key={contract.id}
                    fileName={contract.fileName}
                    filePath={contract.filePath}
                    id={contract.id}
                    type={contract.type}
                    category={contract.category}
                    description={contract.description}
                  />
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
