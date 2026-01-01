import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ContractsListPage from './pages/ContractsListPage';
import ValidationPage from './pages/ValidationPage';
import ApplyChangesPage from './pages/ApplyChangesPage';
import SearchPage from './pages/SearchPage';
import ContractDetailPage from './pages/ContractDetailPage';

function App() {
  return (
    <Router>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography 
              variant="h6" 
              component={Link} 
              to="/"
              sx={{ 
                flexGrow: 1,
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': {
                  opacity: 0.8,
                  cursor: 'pointer'
                }
              }}
            >
              AI Contracts System
            </Typography>
            <Button
              component={Link}
              to="/search"
              color="inherit"
              startIcon={<SearchIcon />}
              sx={{
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Search
            </Button>
          </Toolbar>
        </AppBar>

        <Routes>
          <Route path="/" element={<ContractsListPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="/apply" element={<ApplyChangesPage />} />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;
