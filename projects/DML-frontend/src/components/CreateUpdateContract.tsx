import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { Box, Button, CircularProgress, LinearProgress, Typography } from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import axios from 'axios'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { Classification, DmlChainFactory } from '../contracts/DMLChain'

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

interface CreateUpdateContractInterface {
  readonly appID: bigint
}

function CreateUpdateContract({ appID }: CreateUpdateContractInterface) {
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<DataType | null>(null)
  const [appId, setAppId] = useState<bigint | null>(null)
  const { transactionSigner, activeAddress, algodClient } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const algorand = AlgorandClient.fromClients({ algod: algodClient })
  algorand.setDefaultSigner(transactionSigner)

  const fetchData = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/data')
      setData(response.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  if (!transactionSigner || !activeAddress) {
    enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
    return
  }

  const factory = new DmlChainFactory({
    defaultSender: activeAddress,
    algorand,
  })

  const handleUpdate = async () => {
    if (!data || !appId) {
      enqueueSnackbar('Please check for missing data', { variant: 'warning' })
      return
    }
    try {
      const client = await factory.getAppClientById({ defaultSender: activeAddress, appId: appId })

      const mbrPayFirstDeposit = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: client.appAddress,
        amount: (1).algo(),
      })

      const evaluationMetrics = data.metrics

      const modelEvaluation: Classification = {
        accuracy: evaluationMetrics.accuracy,
        precision: evaluationMetrics.precision,
        recall: evaluationMetrics.recall,
        f1score: evaluationMetrics.f1score,
      }

      const storeCriteria = await client.send.storeClassificationSelectionCriteria({
        args: {
          evaluationMetrics: modelEvaluation,
          mbrPay: mbrPayFirstDeposit,
        },
      })

      console.log('store criteria', storeCriteria)
      enqueueSnackbar(`Contract ${appID} has been updated successfully`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar('Failed to update contract', { variant: 'error' })
      setAppId(null)
    }
  }

  useEffect(() => {
    setAppId(appID)
    fetchData()
  }, [])

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography> Please Ensure Data Is Accurate Prior To Updating</Typography>
      <Box sx={{ mb: 2 }}>
        {data ? (
          <Box
            component="pre"
            sx={{
              textAlign: 'left',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '4px',
              fontSize: '0.75rem',
              backgroundColor: 'black',
              color: 'white',
              wordBreak: 'break-all',
            }}
          >
            {JSON.stringify(data, null, 1)}
          </Box>
        ) : (
          <LinearProgress color="inherit" />
        )}
      </Box>

      <Button variant="contained" color="primary" onClick={handleUpdate} disabled={loading} fullWidth>
        {loading ? <CircularProgress size={24} /> : 'Update Contract'}
      </Button>
    </Box>
  )
}

export default CreateUpdateContract
