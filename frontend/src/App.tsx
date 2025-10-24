import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import ContractsListPage from './pages/ContractsListPage';
import ValidationPage from './pages/ValidationPage';

function App() {
  return (
    <Router>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              AI Contracts System
            </Typography>
            <Button color="inherit" component={Link} to="/">
              Contracts
            </Button>
            <Button color="inherit" component={Link} to="/validation">
              Validation
            </Button>
          </Toolbar>
        </AppBar>

        <Routes>
          <Route path="/" element={<ContractsListPage />} />
          <Route path="/validation" element={<ValidationPage />} />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;
