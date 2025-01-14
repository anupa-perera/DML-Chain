import { Box, Button, CircularProgress, Container, Typography } from '@mui/material'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { contractDeployer } from '../../DML-contracts/contracts/ContractDeployer'

const App: React.FC = () => {
  const [ipfsHash, setIpfsHash] = useState<string>('')
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  interface DataType {
    ipfs_hash: string
    model_params: object
  }
  const [data, setData] = useState<DataType | null>(null)

  const handleDeploy = async () => {
    if (data) {
      setIpfsHash(data.ipfs_hash)
      setLoading(true)
      try {
        console.log('clicking', ipfsHash)
        await contractDeployer(ipfsHash)
        setResponse('Contract deployed successfully')
      } catch (error) {
        console.error('Error deploying contract:', error)
        setResponse('Error deploying contract')
      } finally {
        setLoading(false)
      }
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
  }, [fetchData])

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
          p: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 1,
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
              overflow: 'auto',
              maxHeight: '400px',
              p: 2,
              borderRadius: 1,
              bgcolor: '#f5f5f5',
              '&:hover': {
                bgcolor: '#f0f0f0',
              },
            }}
          >
            {JSON.stringify(data, null, 2)}
          </Box>
        ) : (
          <CircularProgress size={20} />
        )}
      </Box>
    </Container>
  )
}

export default App
