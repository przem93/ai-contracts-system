import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import ContractsListPage from './pages/ContractsListPage';
import ValidationPage from './pages/ValidationPage';
import ApplyChangesPage from './pages/ApplyChangesPage';

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
          </Toolbar>
        </AppBar>

        <Routes>
          <Route path="/" element={<ContractsListPage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="/apply" element={<ApplyChangesPage />} />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;
