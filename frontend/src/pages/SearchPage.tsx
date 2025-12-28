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
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useState, useMemo } from 'react';
import ContractCard from '../components/ContractCard';
import { useContractsControllerGetContractTypes, useContractsControllerGetCategories } from '../api/generated/contracts/contracts';

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
  const [selectedType, setSelectedType] = useState('all');

  // Fetch contract types from API
  const { data: typesData, isLoading: isLoadingTypes, isError: isErrorTypes } = useContractsControllerGetContractTypes();

  // Fetch contract categories from API
  const { data: categoriesData, isLoading: isLoadingCategories, isError: isErrorCategories } = useContractsControllerGetCategories();

  // Transform types data into select options
  const typeOptions = useMemo(() => {
    const allTypesOption = { value: 'all', label: 'All Types' };
    
    if (!typesData?.types || typesData.types.length === 0) {
      return [allTypesOption];
    }

    const apiTypes = typesData.types.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1) // Capitalize first letter
    }));

    return [allTypesOption, ...apiTypes];
  }, [typesData]);

  // Transform categories data into select options
  const categoryOptions = useMemo(() => {
    const allCategoriesOption = { value: 'all', label: 'All Categories' };
    
    if (!categoriesData?.categories || categoriesData.categories.length === 0) {
      return [allCategoriesOption];
    }

    const apiCategories = categoriesData.categories.map(category => ({
      value: category,
      label: category.charAt(0).toUpperCase() + category.slice(1) // Capitalize first letter
    }));

    return [allCategoriesOption, ...apiCategories];
  }, [categoriesData]);

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setSelectedCategory(event.target.value);
  };

  const handleTypeChange = (event: SelectChangeEvent) => {
    setSelectedType(event.target.value);
  };

  // Filter contracts based on search query, category, and type (case-insensitive)
  const filteredContracts = mockContracts.filter(contract => {
    const matchesSearch = contract.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || contract.category === selectedCategory;
    const matchesType = selectedType === 'all' || contract.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
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
              Search contracts by description and filter by category and type
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
              disabled={isLoadingCategories}
            >
              <InputLabel id="category-select-label">Category</InputLabel>
              <Select
                labelId="category-select-label"
                id="category-select"
                name="category"
                value={selectedCategory}
                label="Category"
                onChange={handleCategoryChange}
                startAdornment={
                  <InputAdornment position="start">
                    {isLoadingCategories ? <CircularProgress size={20} /> : <FilterListIcon />}
                  </InputAdornment>
                }
              >
                {categoryOptions.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Type Select */}
            <FormControl 
              sx={{ 
                minWidth: { xs: '100%', md: 240 },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                }
              }}
              disabled={isLoadingTypes}
            >
              <InputLabel id="type-select-label">Type</InputLabel>
              <Select
                labelId="type-select-label"
                id="type-select"
                name="type"
                value={selectedType}
                label="Type"
                onChange={handleTypeChange}
                startAdornment={
                  <InputAdornment position="start">
                    {isLoadingTypes ? <CircularProgress size={20} /> : <FilterListIcon />}
                  </InputAdornment>
                }
              >
                {typeOptions.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Error Alerts for API failures */}
          {isErrorCategories && (
            <Alert severity="error">
              Failed to load contract categories. Using default options.
            </Alert>
          )}
          {isErrorTypes && (
            <Alert severity="error">
              Failed to load contract types. Using default options.
            </Alert>
          )}

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
