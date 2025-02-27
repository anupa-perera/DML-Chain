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
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import axios from 'axios'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { Classification, DmlChainFactory } from '../contracts/DMLChain'
import { addListing } from '../utils/methods'
import { BACKEND_SERVER } from '../utils/types'

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
  const [rewardAmount, setRewardAmount] = useState<bigint | null>(null)
  const [listingPeriod, setListingPeriod] = useState<number>(1)
  const [url, seturl] = useState<string>('')

  const { enqueueSnackbar } = useSnackbar()

  const { transactionSigner, activeAddress, algodClient } = useWallet()

  const algorand = AlgorandClient.fromClients({ algod: algodClient })
  algorand.setDefaultSigner(transactionSigner)

  const handleDeploy = async () => {
    setLoading(true)
    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }
    setLoading(true)

    const factory = new DmlChainFactory({
      defaultSender: activeAddress,
      algorand,
    })

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
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    setLoading(true)
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

      if (!rewardAmount || rewardAmount < 10) {
        enqueueSnackbar('Please enter a valid amount', { variant: 'error' })
        return
      }

      const rewardPoolTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: client.appAddress,
        amount: rewardAmount.algo(),
      })

      await client
        .newGroup()
        .assignRewardPool({ args: { rewardPoolAmount: rewardAmount * 10n ** 6n, rewardPoolTxn } })
        .storeClassificationSelectionCriteria({
          args: {
            evaluationMetrics: modelEvaluation,
            mbrPay: mbrPayFirstDeposit,
          },
        })
        .send({ populateAppCallResources: true })

      const listingData = {
        address: activeAddress,
        contractId: Number(client.appId),
        createdAt: new Date(),
        expiresAt: new Date(new Date().setDate(new Date().getDate() + listingPeriod)),
        url: url,
      }

      await addListing(listingData)

      enqueueSnackbar(`Contract ${appId} has been updated successfully`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar('Failed to update contract', { variant: 'error' })
    } finally {
      handleClose()
    }
  }

  const handleClose = () => {
    setAppId(null)
    setRewardAmount(null)
    setLoading(false)
    setData(null)
    closeModal()
  }

  useEffect(() => {
    if (!openModal) {
      return
    }

    const fetchData = async () => {
      try {
        const response = await axios.get(`${BACKEND_SERVER}/data`)
        setData(response.data)
      } catch (error) {
        enqueueSnackbar('Error fetching data', { variant: 'error' })
      }
    }

    fetchData()
  }, [openModal, enqueueSnackbar])

  return (
    <Dialog open={openModal} onClose={handleClose} maxWidth="sm" fullWidth>
      {!appId && (
        <>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Deploy Contract</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please deploy a new contract to the host the model request listing. This action cannot be undone.
            </DialogContentText>
            <DialogContentText sx={{ color: 'red', textAlign: 'center' }}>
              **Please ensure your model is feeding data into the backend**
            </DialogContentText>
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
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Submit Model Data</DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center' }}>
              <Typography> Please Ensure Data Is Accurate Prior To Submission</Typography>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography> Listing Period</Typography>
                <Typography sx={{ color: 'red', fontSize: '0.875rem' }}> (*Maximum 31 days)</Typography>
              </Box>
              <Select
                size="small"
                variant="outlined"
                fullWidth
                value={listingPeriod}
                onChange={(e) => setListingPeriod(Number(e.target.value))}
                sx={{ mb: 2 }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 200,
                    },
                  },
                }}
              >
                {[...Array(31)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {i + 1}
                  </MenuItem>
                ))}
              </Select>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography> Reward Amount</Typography>
                <Typography sx={{ color: 'red', fontSize: '0.875rem' }}> (*Minimum allowed amount is 10 Algos)</Typography>
              </Box>
              <TextField
                size="small"
                variant="outlined"
                margin="dense"
                onChange={(e) => {
                  const value = BigInt(e.target.value)
                  setRewardAmount(value)
                }}
                required
                type="number"
                fullWidth
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography> Link to Listing Advert</Typography>
                <Typography sx={{ color: 'red', fontSize: '0.875rem' }}>
                  (*Refer to template{' '}
                  <a href="https://tinyurl.com/3c2s3syt" target="_blank" rel="noopener noreferrer">
                    here
                  </a>
                  )
                </Typography>
              </Box>
              <TextField
                size="small"
                variant="outlined"
                margin="dense"
                onChange={(e) => {
                  const value = String(e.target.value)
                  seturl(value)
                }}
                required
                fullWidth
                sx={{ mb: 2 }}
              />
              <Button variant="contained" color="primary" onClick={handleUpdate} disabled={loading || !rewardAmount} fullWidth>
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
