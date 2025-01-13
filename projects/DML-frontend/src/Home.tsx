import { Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material'
import React, { useState } from 'react'
import { contractDeployer } from '../../DML-contracts/contracts/ContractDeployer'

const App: React.FC = () => {
  const [ipfsHash, setIpfsHash] = useState<string>('')
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const handleDeploy = async () => {
    setLoading(true)
    try {
      console.log(ipfsHash)
      await contractDeployer(ipfsHash)
      setResponse('Contract deployed successfully')
    } catch (error) {
      console.error('Error deploying contract:', error)
      setResponse('Error deploying contract')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Deploy Contract
        </Typography>
        <TextField
          fullWidth
          label="Enter IPFS Hash"
          variant="outlined"
          value={ipfsHash}
          onChange={(e) => setIpfsHash(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" color="primary" onClick={handleDeploy} disabled={loading} fullWidth>
          {loading ? <CircularProgress size={24} /> : 'Deploy'}
        </Button>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
          {response}
        </Typography>
      </Box>
    </Container>
  )
}

export default App
