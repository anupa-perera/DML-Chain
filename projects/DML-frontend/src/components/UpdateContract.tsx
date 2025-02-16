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
  TextField,
} from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import axios from 'axios'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { DmlChainFactory } from '../contracts/DMLChain'
import { getIpfsHash } from '../utils/ContractDeployer'

interface UpdateContractInterface {
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

const UpdateContract = ({ openModal, closeModal }: UpdateContractInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [appId, setAppId] = useState<bigint | null>(null)
  const { enqueueSnackbar } = useSnackbar()
  const [fileRetrieved, setFileRetrieved] = useState<boolean>(false)
  const [data, setData] = useState<DataType | null>(null)

  const { transactionSigner, activeAddress, algodClient } = useWallet()

  const algorand = AlgorandClient.fromClients({ algod: algodClient })
  algorand.setDefaultSigner(transactionSigner)

  const handleClose = () => {
    setAppId(null)
    setFileRetrieved(false)
    setLoading(false)
    closeModal()
  }

  const retrieveModelFile = async () => {
    if (!appId) {
      enqueueSnackbar('Please Enter a valid contract ID', { variant: 'warning' })
      return
    }
    try {
      setLoading(true)
      const ipfsHash = await getIpfsHash(appId)
      await axios.get(`http://127.0.0.1:5000/retrieve-model/${appId}/${ipfsHash}`)
      enqueueSnackbar(`Download will begin shortly for contract ID ${appId}`, { variant: 'success' })
      setFileRetrieved(true)
    } catch (error) {
      enqueueSnackbar('Failed to download model file, please check the contract ID & try again!', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitModelParams = async () => {
    if (!data || !appId || !activeAddress) {
      enqueueSnackbar('Please check for missing data', { variant: 'warning' })
      return
    }
    setLoading(true)

    const factory = new DmlChainFactory({
      defaultSender: activeAddress,
      algorand,
    })

    try {
      const client = await factory.getAppClientById({ defaultSender: activeAddress, appId: appId })

      const modelSelectionCriteria = await client
        .newGroup()
        .classModelSelectionCriteria({
          args: { modelEvaluationMetrics: data.metrics },
        })
        .simulate({
          skipSignatures: true,
          allowUnnamedResources: true,
        })

      const rewardCalculation = {
        score: 300n,
      }
      const reward = await client
        .newGroup()
        .distributeRewards({ args: { contributor: rewardCalculation } })
        .simulate({
          skipSignatures: true,
          allowUnnamedResources: true,
        })

      console.log(reward.returns, 'this is reward')

      const isAccepted = modelSelectionCriteria

      if (isAccepted) {
        const boxMBRPay = await algorand.createTransaction.payment({
          sender: activeAddress,
          receiver: client.appAddress,
          amount: (1).algo(),
        })

        await client.send.storeModelParams({
          args: {
            mbrPay: boxMBRPay,
            address: activeAddress,
            paramsData: {
              paramHash: data.param_ipfs_hash,
              paramKey: data.param_key,
            },
          },
        })
      }

      enqueueSnackbar('Your model data has been successfully submitted for evaluation', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar('Failed to submit data', { variant: 'warning' })
      console.log('this is error', error)
    } finally {
      setLoading(false)
      handleClose()
    }
  }

  const fetchData = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:5000/data`)
      setData(response.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    if (openModal && fileRetrieved) {
      fetchData()
    }
  }, [fileRetrieved, openModal])

  return (
    <Dialog open={openModal} onClose={handleClose}>
      <>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Train & Earn</DialogTitle>
        <DialogContent>
          <DialogContentText>Please Enter The Contract ID to download the Model</DialogContentText>
          <TextField
            fullWidth
            label="Contract ID"
            variant="outlined"
            margin="normal"
            placeholder="Enter your Contract ID"
            onChange={(e) => {
              const value = BigInt(e.target.value)
              setAppId(value)
            }}
            required
            type="number"
            disabled={fileRetrieved}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Button onClick={retrieveModelFile} disabled={loading || fileRetrieved} variant="contained" color="primary">
              {loading ? 'Downloading...' : 'Download Model'}
            </Button>
          </Box>
          {fileRetrieved && (
            <Box sx={{ textAlign: 'center' }}>
              <DialogContentText sx={{ mt: 1, mb: 1 }}>Please Ensure Data Is Accurate Prior To Submitting</DialogContentText>
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

              <Button variant="contained" color="primary" onClick={handleSubmitModelParams} disabled={loading} fullWidth>
                {loading ? <CircularProgress size={24} /> : 'Submit Model'}
              </Button>
            </Box>
          )}
        </DialogContent>
      </>
    </Dialog>
  )
}

export default UpdateContract
