import { Box, Button, Container, Divider, Paper, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useWallet } from '@txnlab/use-wallet-react'
import axios from 'axios'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import CreateContract from './components/CreateContract'
import FetchSubsscribedListings from './components/FetchSubscribedListings'
import FetchTrainedModels from './components/FetchTrainedModels'
import UpdateContract from './components/UpdateContract'
import { BACKEND_SERVER } from './utils/types'

const Home = () => {
  const { activeAddress } = useWallet()
  const [openDeployModal, setOpenDeployModal] = useState<boolean>(false)
  const [openUpdateModal, setOpenUpdateModal] = useState<boolean>(false)
  const [openFetchModelParams, setFetchModelParams] = useState<boolean>(false)
  const [openFetchSubscribedListings, setFetchSubscribedListings] = useState<boolean>(false)

  const toggleDeployModal = () => {
    setOpenDeployModal(!openDeployModal)
  }

  const toggleUpdateModal = () => {
    setOpenUpdateModal(!openUpdateModal)
  }

  const toggleFetchModelParamsModal = () => {
    setFetchModelParams(!openFetchModelParams)
  }

  const toggleFetchSubsscribedListings = () => {
    setFetchSubscribedListings(!openFetchSubscribedListings)
  }

  const fetchAccountDetails = async () => {
    try {
      const checkAccountResponse = await axios.get(`${BACKEND_SERVER}/check-address/${activeAddress}`)
      const isAccountExist = await checkAccountResponse.data.exists
      if (!isAccountExist) {
        await axios.post(`${BACKEND_SERVER}/create-user/${activeAddress}`)
      }
    } catch (error) {
      enqueueSnackbar('Error fetching data', { variant: 'error' })
    }
  }

  useEffect(() => {
    let isMounted = true
    if (activeAddress && isMounted) {
      fetchAccountDetails()
    }
    return () => {
      isMounted = false
    }
  }, [activeAddress])

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
                Please click on your desired wallet to Connect
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
                      Request Model Training
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
                      onClick={toggleUpdateModal}
                    >
                      View All Model listings
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
                      onClick={toggleFetchSubsscribedListings}
                    >
                      View Subscribed Model listings
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
                      onClick={toggleFetchModelParamsModal}
                    >
                      Fetch Trained Models
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>
        </Paper>
        <CreateContract openModal={openDeployModal} closeModal={toggleDeployModal} />
        <UpdateContract openModal={openUpdateModal} closeModal={toggleUpdateModal} />
        <FetchTrainedModels openModal={openFetchModelParams} closeModal={toggleFetchModelParamsModal} />
        <FetchSubsscribedListings openModal={openFetchSubscribedListings} closeModal={toggleFetchSubsscribedListings} />
      </Container>
    </Box>
  )
}

export default Home
