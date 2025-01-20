import { Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { createContract, generateAccount, submitModelParams } from './utils/ContractDeployer'

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

const App: React.FC = () => {
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [address, setAddress] = useState<string>('')
  const [data, setData] = useState<DataType | null>(null)
  const [generatedAccount, setGeneratedAccount] = useState<string>('')
  const [appID, setAppID] = useState<number>()
  const [DOAddress, setDOAddress] = useState<string>('')

  const handleDeploy = async () => {
    if (data) {
      setLoading(true)
      const evaluationMetrics = data.metrics
      try {
        const contractResult = await createContract(
          data.model_ipfs_hash,
          {
            accuracy: BigInt(evaluationMetrics?.accuracy),
            precision: BigInt(evaluationMetrics?.precision),
            recall: BigInt(evaluationMetrics?.recall),
            f1score: BigInt(evaluationMetrics?.f1score),
          },
          address,
        )

        const response = contractResult

        setResponse(`Contract deployed successfully AppID is ${response}`)
        setLoading(false)
      } catch (error) {
        setResponse(`Error deploying contract' ${error}`)
        setLoading(false)
      }
    } else {
      console.log('no data')
    }
  }

  const handleParamsUpdate = async () => {
    console.log(appID, 'this is app id')
    if (data && appID) {
      setLoading(true)
      try {
        const contractResult = await submitModelParams(
          {
            paramHash: data.param_ipfs_hash,
            paramKey: data.param_key,
          },
          DOAddress,
          BigInt(appID),
        )

        const response = contractResult

        setResponse(`Contract deployed successfully AppID is ${response}`)
        setLoading(false)
      } catch (error) {
        setResponse(`Error deploying contract' ${error}`)
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
        <Typography variant="h6" gutterBottom>
          Generate Account
        </Typography>
        <Box sx={{ mb: 2 }}>
          <TextField value={generatedAccount} fullWidth variant="outlined" label="Create Account" />
          <Button
            disabled={loading}
            fullWidth
            variant="contained"
            sx={{ mt: 1 }}
            onClick={() => {
              setLoading(true)
              const generatedAccount = generateAccount()
              setGeneratedAccount(generatedAccount)
              navigator.clipboard.writeText(generatedAccount)
              setLoading(false)
            }}
          >
            generate Account
          </Button>
        </Box>
        <Typography variant="h6" gutterBottom>
          Deploy Contract
        </Typography>
        <TextField
          fullWidth
          label="Wallet Address"
          variant="outlined"
          margin="normal"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={handleDeploy} disabled={loading} fullWidth>
          {loading ? <CircularProgress size={24} /> : 'Deploy'}
        </Button>
      </Box>
      <Box> {response}</Box>
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
            }}
          >
            {JSON.stringify(data, null, 1)}
          </Box>
        ) : (
          <CircularProgress size={20} />
        )}
      </Box>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Store Model Params
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ minWidth: '150px' }}>Enter Account</Typography>
        <TextField
          fullWidth
          label="Account"
          variant="outlined"
          margin="normal"
          placeholder="Enter your account"
          onChange={(e) => setDOAddress(e.target.value)}
          required
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ minWidth: '150px' }}>Enter AppID</Typography>
        <TextField
          fullWidth
          label="AppID"
          variant="outlined"
          margin="normal"
          placeholder="Enter your account"
          onChange={(e) => {
            const value = Number(e.target.value)
            console.log('AppID Input Value:', value) // Log input value
            setAppID(value)
          }}
          required
          type="number"
        />
      </Box>
      {data ? (
        <Box
          component="pre"
          sx={{
            textAlign: 'left',
          }}
        >
          Params IPFS Hash: {JSON.stringify(data.model_ipfs_hash, null, 1)}
          <br />
          Params Key: {JSON.stringify(data.param_key, null, 1)}
        </Box>
      ) : (
        <CircularProgress size={20} />
      )}
      <Button fullWidth variant="contained" sx={{ mt: 1 }} onClick={handleParamsUpdate} disabled={loading}>
        Store Model Params
      </Button>
    </Container>
  )
}

export default App
