import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import axios from 'axios'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Classification, DmlChainFactory } from '../contracts/DMLChain'

interface DeployContractInterface {
  openModal: boolean
  closeModal: () => void
}

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

const CreateContract = ({ openModal, closeModal }: DeployContractInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [appId, setAppId] = useState<bigint | null>(null)
  const [data, setData] = useState<DataType | null>(null)

  const { enqueueSnackbar } = useSnackbar()

  const { transactionSigner, activeAddress, algodClient } = useWallet()

  const algorand = AlgorandClient.fromClients({ algod: algodClient })
  algorand.setDefaultSigner(transactionSigner)

  const handleDeploy = async () => {
    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }
    setLoading(true)

    const factory = new DmlChainFactory({
      defaultSender: activeAddress,
      algorand,
    })

    fetchData()

    if (!data) {
      enqueueSnackbar('Please ensure the model is feeding data into the backend', { variant: 'warning' })
      handleClose()
      return
    }

    try {
      const { appClient: client } = await factory.send.create.createApplication({ args: { modelHash: data?.model_ipfs_hash } })
      const appID = client.appId
      setAppId(appID)

      enqueueSnackbar(`Contract deployed with App ID: ${appID}`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar('Failed to deploy contract', { variant: 'error' })
    }
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!data || !appId || !activeAddress) {
      enqueueSnackbar('Please check for missing data', { variant: 'warning' })
      return
    }

    const factory = new DmlChainFactory({
      defaultSender: activeAddress,
      algorand,
    })

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

      await client.send.storeClassificationSelectionCriteria({
        args: {
          evaluationMetrics: modelEvaluation,
          mbrPay: mbrPayFirstDeposit,
        },
      })

      enqueueSnackbar(`Contract ${appId} has been updated successfully`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar('Failed to update contract', { variant: 'error' })
    } finally {
      setAppId(null)
      closeModal()
    }
  }

  const fetchData = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:5000/data`)
      setData(response.data)
    } catch (error) {
      enqueueSnackbar('Error fetching data', { variant: 'error' })
    }
  }

  const handleClose = () => {
    setAppId(null)
    setLoading(false)
    closeModal()
  }

  return (
    <Dialog open={openModal} onClose={handleClose} maxWidth="sm" fullWidth>
      {!appId && (
        <>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Deploy Contract</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please deploy a new contract to the host the model request listing. This action cannot be undone.
            </DialogContentText>
            <DialogContentText sx={{ color: 'red' }}>**Please ensure your model is feeding data into the backend**</DialogContentText>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              <Button onClick={handleDeploy} disabled={loading} variant="contained" color="primary">
                {loading ? 'Deploying...' : 'Deploy Contract'}
              </Button>
              <Button variant="contained" onClick={handleClose} disabled={loading} color="error">
                Cancel
              </Button>
            </Box>
          </DialogContent>
        </>
      )}
      {!!appId && (
        <>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Update Contract</DialogTitle>
          <DialogContent>
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
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}

export default CreateContract
