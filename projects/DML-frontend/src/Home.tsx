import { Box, Button, CircularProgress, Container, Typography } from '@mui/material'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { contractDeployer } from '../../DML-contracts/contracts/ContractDeployer'

const App: React.FC = () => {
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  interface DataType {
    ipfs_hash: string
    model_params: object
    metrics: object
  }
  const [data, setData] = useState<DataType | null>(null)

  const handleDeploy = async () => {
    if (data) {
      setLoading(true)
      console.log('in here', data)
      try {
        await contractDeployer(data.ipfs_hash, { accuracy: 10n, precision: 10n, recall: 10n, f1score: 10n })
        setResponse('Contract deployed successfully')
      } catch (error) {
        console.error('Error deploying contract:', error)
        setResponse('Error deploying contract')
      } finally {
        setLoading(false)
      }
    } else {
      console.log('no data')
    }
  }

  const fetchData = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/data')
      setData(response.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Deploy Contract
        </Typography>
        <Typography sx={{ mb: 2 }}>{data?.ipfs_hash}</Typography>
        <Button variant="contained" color="primary" onClick={handleDeploy} disabled={loading} fullWidth>
          {loading ? <CircularProgress size={24} /> : 'Deploy'}
        </Button>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
          {response}
        </Typography>
      </Box>
      <Box
        sx={{
          mt: 4,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Data Preview
        </Typography>
        {data ? (
          <Box
            component="pre"
            sx={{
              textAlign: 'left',
              borderRadius: 1,
              width: '600px',
              bgcolor: '#f5f5f5',
              '&:hover': {
                bgcolor: '#f0f0f0',
              },
            }}
          >
            {JSON.stringify(data, null, 1)}
          </Box>
        ) : (
          <CircularProgress size={20} />
        )}
      </Box>
    </Container>
  )
}

export default App
