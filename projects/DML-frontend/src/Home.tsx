import { Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import {
  createContract,
  generateAccount,
  getIpfsHash,
  getStoredModelParams,
  modelSelectionCriteria,
  submitModelParams,
} from './utils/ContractDeployer'

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
  const [publicAddress, setPublicAddress] = useState<string>('')
  const [data, setData] = useState<DataType | null>(null)
  const [generatedAccount, setGeneratedAccount] = useState<string>('')
  const [appID, setAppID] = useState<number>()
  const [DOAddress, setDOAddress] = useState<string>('')
  const [MOAddress, setMOAddress] = useState<string>('')
  const [ipfsHash, setIpfsHash] = useState<string>('')
  const [paramsData, setParamsData] = useState<Record<string, { paramHash: string; paramKey: string }> | null>(null)

  const handleDeploy = async () => {
    if (data) {
      setLoading(true)
      const evaluationMetrics = data.metrics
      try {
        const contractResult = await createContract(
          data.model_ipfs_hash,
          {
            accuracy: evaluationMetrics?.accuracy,
            precision: evaluationMetrics?.precision,
            recall: evaluationMetrics?.recall,
            f1score: evaluationMetrics?.f1score,
          },
          generatedAccount,
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

  const handlesubmitModelParams = async () => {
    if (data && appID) {
      setLoading(true)
      try {
        const acceptanceCriteria = await modelSelectionCriteria(address, BigInt(appID), data.metrics)
        if (acceptanceCriteria) {
          console.log('Model has been accepted for further consideration', acceptanceCriteria)
          const contractResult = await submitModelParams(
            {
              paramHash: data.param_ipfs_hash,
              paramKey: data.param_key,
            },
            DOAddress,
            BigInt(appID),
          )

          contractResult
        } else {
          console.log('failed the minimum requirements', acceptanceCriteria)
        }
      } catch (error) {
        console.log(`Error deploying contract' ${error}`)
      } finally {
        setLoading(false)
      }
    } else {
      console.log('no data')
    }
  }

  const handleGetAllModelParams = async () => {
    if (address && appID) {
      try {
        setLoading(true)
        const allStoredParams = await getStoredModelParams(MOAddress, BigInt(appID))
        setParamsData(allStoredParams)
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    } else {
      console.log('missing data', address, appID)
    }
  }

  const retriveModelFile = async () => {
    if (appID) {
      try {
        setLoading(true)
        const ipfsHash = await getIpfsHash(BigInt(appID))

        if (ipfsHash) {
          setIpfsHash(ipfsHash)
        }
        await axios.get(`http://127.0.0.1:5000/retrieve-model/${ipfsHash}`)
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    } else {
      console.log('missing data', address, appID)
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
          <Typography variant="body1" sx={{ mt: 1, mb: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {publicAddress || 'No address generated yet'}
          </Typography>
          <Button
            disabled={loading}
            fullWidth
            variant="contained"
            sx={{ mt: 1 }}
            onClick={() => {
              setLoading(true)
              const generatedAccount = generateAccount()
              setGeneratedAccount(generatedAccount.mnemonic)
              setPublicAddress(generatedAccount.address)
              navigator.clipboard.writeText(generatedAccount.mnemonic)
              setLoading(false)
            }}
          >
            generate Account
          </Button>
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

      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        {' '}
        Retrieve the model
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ minWidth: '150px' }}>Enter AppID</Typography>
        <TextField
          fullWidth
          label="AppID"
          variant="outlined"
          margin="normal"
          placeholder="Enter your Contract ID"
          onChange={(e) => {
            const value = Number(e.target.value)
            setAppID(value)
            console.log('AppID Input Value:', appID)
          }}
          required
          type="number"
        />
      </Box>

      <Box> Model IPFS HASH is {ipfsHash}</Box>
      <Button fullWidth variant="contained" sx={{ mt: 1 }} onClick={retriveModelFile} disabled={loading}>
        Retrieve Model file
      </Button>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Store Model Params
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ minWidth: '150px' }}>Enter Account Address</Typography>
        <TextField
          fullWidth
          label="Account"
          variant="outlined"
          margin="normal"
          placeholder="Enter your account address"
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
            console.log('AppID Input Value:', value)
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
      <Button fullWidth variant="contained" sx={{ mt: 1 }} onClick={handlesubmitModelParams} disabled={loading}>
        Store Model Params
      </Button>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Get All Model Params
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ minWidth: '150px' }}>Model Owner Account</Typography>
        <TextField
          fullWidth
          label="Account"
          variant="outlined"
          margin="normal"
          placeholder="Enter your account address"
          onChange={(e) => setMOAddress(e.target.value)}
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
          placeholder="Enter your Contract ID"
          onChange={(e) => {
            const value = Number(e.target.value)
            setAppID(value)
          }}
          required
          type="number"
        />
      </Box>
      <Box>
        {paramsData && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Stored Model Parameters:
            </Typography>
            {Object.entries(paramsData).map(([key, value]) => (
              <Box key={key} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 80 }}>
                    DO Address
                  </Typography>
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {key}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 80 }}>
                    Hash
                  </Typography>
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {value.paramHash}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 80 }}>
                    Key
                  </Typography>
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {value.paramKey}
                  </Typography>
                </Box>
              </Box>
            ))}
          </>
        )}
      </Box>
      <Button fullWidth variant="contained" sx={{ mt: 1 }} onClick={handleGetAllModelParams} disabled={loading}>
        Get All Model Params
      </Button>
    </Container>
  )
}

export default App
