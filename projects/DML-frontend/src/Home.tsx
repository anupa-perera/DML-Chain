import { Box, Button, CircularProgress, Container, Typography } from '@mui/material'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { contractDeployer } from '../../DML-contracts/contracts/ContractDeployer'

const App: React.FC = () => {
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  interface DataType {
    model_ipfs_hash: string
    model_params: object
    metrics: {
      accuracy: bigint
      precision: bigint
      recall: bigint
      f1score: bigint
    }
    param_ipfs_hash: string
    param_key: string
  }
  const [data, setData] = useState<DataType | null>(null)

  const handleDeploy = async () => {
    if (data) {
      setLoading(true)

      const evaluationMetrics = data.metrics
      try {
        await contractDeployer(
          data.model_ipfs_hash,
          {
            accuracy: BigInt(evaluationMetrics?.accuracy),
            precision: BigInt(evaluationMetrics?.precision),
            recall: BigInt(evaluationMetrics?.recall),
            f1score: BigInt(evaluationMetrics?.f1score),
          },
          { paramHash: data.param_ipfs_hash, paramKey: data.param_key },
        )
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
        <Typography sx={{ mb: 2 }}>{data?.model_ipfs_hash}</Typography>
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
