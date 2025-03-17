import { Divider, Typography } from '@mui/material'

const WelcomePanel = () => {
  return (
    <>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 'bold',
          letterSpacing: 1.5,
          color: '#ff6333',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Welcome to
      </Typography>
      <Typography
        variant="h3"
        component="h1"
        sx={{
          fontWeight: 'bold',
          color: '#b23c17',
          fontFamily: 'Cursive, Arial, sans-serif',
        }}
      >
        DML-CHAIN
      </Typography>

      <Typography variant="body1" sx={{ py: 2, color: '#757575', fontFamily: 'Cursive, Arial, sans-serif' }}>
        Please click on your desired wallet to Connect
      </Typography>
      <Divider />
    </>
  )
}

export default WelcomePanel
