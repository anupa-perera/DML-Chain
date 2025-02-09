import { Box, Button, Container, Divider, Paper, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useWallet } from '@txnlab/use-wallet-react'
import { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import CreateContract from './components/CreateContract'

const Home = () => {
  const { activeAddress } = useWallet()
  const [openDeployModal, setOpenDeployModal] = useState<boolean>(false)

  const toggleDeployModal = () => {
    setOpenDeployModal(!openDeployModal)
  }

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundColor: '#bdbdbd',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
        overflow: 'auto',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            backgroundColor: '#ffffff',
          }}
        >
          {!activeAddress && (
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
                Please click on your desired wallet to sign in
              </Typography>
              <Divider />
            </>
          )}
          <ConnectWallet />

          <Grid container spacing={3} direction="column" alignItems="center">
            <Grid sx={{ width: '100%' }}>
              {activeAddress && (
                <>
                  <Grid sx={{ width: '100%', mb: 2 }}>
                    <Button
                      variant="outlined"
                      sx={{
                        borderColor: '#b23c17',
                        width: '100%',
                        color: '#b23c17',
                        fontFamily: 'Cursive, Arial, sans-serif',
                        fontWeight: 'bold',
                      }}
                      onClick={toggleDeployModal}
                    >
                      Model Owner
                    </Button>
                  </Grid>
                  <Grid sx={{ width: '100%', mb: 2 }}>
                    <Button
                      variant="outlined"
                      sx={{
                        borderColor: '#b23c17',
                        width: '100%',
                        color: '#b23c17',
                        fontFamily: 'Cursive, Arial, sans-serif',
                        fontWeight: 'bold',
                      }}
                    >
                      Data Owner
                    </Button>
                  </Grid>
                  <Grid sx={{ width: '100%' }}>
                    <Button
                      variant="outlined"
                      sx={{
                        borderColor: '#b23c17',
                        width: '100%',
                        color: '#b23c17',
                        fontFamily: 'Cursive, Arial, sans-serif',
                        fontWeight: 'bold',
                      }}
                    >
                      Model verifier
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>
        </Paper>
        <CreateContract openModal={openDeployModal} closeModal={toggleDeployModal} />
      </Container>
    </Box>
  )
}

export default Home
