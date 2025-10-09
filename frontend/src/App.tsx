import { useState } from 'react'
import { 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Box,
  Stack 
} from '@mui/material'
import { Add } from '@mui/icons-material'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Container maxWidth="md">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        py: 4
      }}>
        <Stack spacing={3} alignItems="center">
          <Typography 
            variant="h2" 
            component="h1" 
            sx={{
              background: 'linear-gradient(90deg, #646cff 0%, #4cb782 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}
          >
            AI Contracts System
          </Typography>
          
          <Typography variant="h5" color="text.secondary">
            AI Coder Agent Contract System
          </Typography>
          
          <Card sx={{ minWidth: 300, mt: 2 }}>
            <CardContent>
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                startIcon={<Add />}
                onClick={() => setCount((count) => count + 1)}
              >
                Count is {count}
              </Button>
            </CardContent>
          </Card>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Frontend is running with Vite + React + TypeScript + Material UI
          </Typography>
        </Stack>
      </Box>
    </Container>
  )
}

export default App
