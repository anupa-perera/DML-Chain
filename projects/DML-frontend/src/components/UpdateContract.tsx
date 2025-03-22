import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import DownloadIcon from '@mui/icons-material/Download'
import FeedIcon from '@mui/icons-material/Feed'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import { encodeAddress } from 'algosdk'
import axios from 'axios'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { DmlChainFactory } from '../contracts/DMLChain'
import { addSubscribedListing, fetchListings } from '../utils/methods'
import { AddSubscribedListingsPayload, BACKEND_SERVER, ListingsDTO } from '../utils/types'

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
  const [listings, setListings] = useState<Array<ListingsDTO>>([])
  const [listing, setListing] = useState<ListingsDTO | null>(null)

  const { transactionSigner, activeAddress, algodClient } = useWallet()

  const algorand = AlgorandClient.fromClients({ algod: algodClient })
  algorand.setDefaultSigner(transactionSigner)

  const handleClose = () => {
    setAppId(null)
    setFileRetrieved(false)
    setListings([])
    setLoading(false)
    closeModal()
    setData(null)
  }

  const retrieveModelFile = async (id: bigint) => {
    if (!activeAddress) {
      enqueueSnackbar('Please Connect to an account', { variant: 'warning' })
      return
    }
    if (!id) {
      enqueueSnackbar('Please Enter a valid contract ID', { variant: 'warning' })
      return
    }
    const factory = new DmlChainFactory({
      defaultSender: activeAddress,
      algorand,
    })
    try {
      setLoading(true)
      const client = await factory.getAppClientById({ defaultSender: activeAddress, appId: id })

      const ipfsHash = await client.state.global.ipfsHash()

      const isBoxExist = async () => {
        const boxIDs = await algorand.app.getBoxNames(id)

        for (const box of boxIDs) {
          if (box.nameRaw.length == 32) {
            const extAddr = encodeAddress(box.nameRaw)
            if (extAddr === activeAddress) {
              return true
            }
          }
        }
        return false
      }

      const boxExists = await isBoxExist()

      if (!boxExists) {
        const stakeAmount = Number((await algorand.app.getGlobalState(client.appId)).stakeAmount?.value) / 10 ** 6
        const stakeAmountTxn = await algorand.createTransaction.payment({
          sender: activeAddress,
          receiver: client.appAddress,
          amount: stakeAmount.algos(),
        })

        await client.send.commitToListing({ args: { stakeAmountTxn } })
      }

      await axios.get(`${BACKEND_SERVER}/retrieve-model/${id}/${ipfsHash}`)
      enqueueSnackbar(`Download will begin shortly`, { variant: 'success' })
      setFileRetrieved(true)
    } catch (error) {
      enqueueSnackbar('Failed to download model file', { variant: 'error' })
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
      const getDataResponse = await axios.get(`${BACKEND_SERVER}/get-user/${activeAddress}`)
      const reputation = await getDataResponse.data.reputation
      const client = await factory.getAppClientById({ defaultSender: activeAddress, appId: appId })

      const score: bigint = data.metrics.accuracy + data.metrics.precision + data.metrics.recall + data.metrics.f1score

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
            score: score,
            reputation: reputation,
          },
        },
      })

      if (!listing) {
        enqueueSnackbar('No Listing has been found', { variant: 'warning' })
        return
      }

      const userSubscribedData: AddSubscribedListingsPayload = {
        address: activeAddress,
        creatorAddress: listing.creator,
        reputation: listing.reputation,
        contractId: listing.contractId,
        createdAt: listing.createdAt,
        expiresAt: listing.expiresAt,
        url: listing.url,
      }

      await addSubscribedListing(userSubscribedData)

      enqueueSnackbar('Your model data has been successfully submitted for evaluation', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(`Failed to submit data `, { variant: 'warning' })
    } finally {
      setLoading(false)
      handleClose()
    }
  }

  const fetchData = async () => {
    try {
      const response = await axios.get(`${BACKEND_SERVER}/data`)
      setData(response.data)
    } catch (error) {
      enqueueSnackbar('Error fetching data', { variant: 'warning' })
    }
  }

  useMemo(async () => {
    if (openModal && activeAddress) {
      const data = await fetchListings(activeAddress)
      setListings(data)
    }
  }, [activeAddress, openModal])

  return (
    <Dialog open={openModal} onClose={handleClose}>
      <>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', padding: 1 }}>
          {appId ? `Subscribing to App ID: ${appId.toString()}` : 'View All Model Listings'}
        </DialogTitle>
        <DialogContent>
          {!fileRetrieved && (
            <Box sx={{ mb: 2, p: 1, maxHeight: '500px', overflow: 'auto' }}>
              <Box
                sx={{
                  borderRadius: '4px',
                  overflow: 'auto',
                  width: '500px',
                }}
              >
                {listings.length > 0 ? (
                  <List sx={{ width: '100%', maxHeight: 300 }}>
                    {listings.map((listing) => (
                      <ListItem
                        key={listing.contractId.toString()}
                        disableGutters
                        sx={{
                          mb: 1,
                          borderRadius: 1,
                          border: '1px solid #e0e0e0',
                          padding: '8px 15px',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            cursor: 'pointer',
                          },
                          transition: 'background-color 0.2s ease',
                        }}
                        secondaryAction={
                          <Box sx={{ display: 'flex' }}>
                            <IconButton
                              size="small"
                              sx={{
                                ml: 1,
                                color: 'primary.main',
                                '&:hover': { color: 'primary.dark' },
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (listing.url) {
                                  window.open(listing.url, '_blank')
                                }
                              }}
                              title="View Documentation"
                            >
                              <FeedIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={{
                                color: 'success.main',
                                '&:hover': { color: 'success.dark' },
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setAppId(BigInt(listing.contractId))
                                retrieveModelFile(BigInt(listing.contractId))
                                setListing(listing)
                              }}
                              title="Download Model"
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={`ID: ${listing.contractId.toString()}`}
                          secondary={
                            <span
                              style={{
                                color: listing.reputation > 75 ? '#2e7d32' : listing.reputation > 50 ? '#ffeb3b' : '#f50057',
                              }}
                            >
                              {`Reputation: ${listing.reputation || 'N/A'}`}
                            </span>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 3,
                      textAlign: 'center',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      minHeight: '150px',
                    }}
                  >
                    <DialogContentText>No listings found.</DialogContentText>
                    <DialogContentText sx={{ mt: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                      Please check back later or create a new listing.
                    </DialogContentText>
                  </Box>
                )}
              </Box>
            </Box>
          )}

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
                      padding: '8px',
                      fontSize: '0.75rem',
                      backgroundColor: 'black',
                      color: 'white',
                      wordBreak: 'break-all',
                    }}
                  >
                    {JSON.stringify(
                      {
                        metrics: data.metrics,
                        param_ipfs_hash: data.param_ipfs_hash,
                        param_key: data.param_key,
                      },
                      null,
                      2,
                    )}
                  </Box>
                ) : (
                  <LinearProgress color="inherit" />
                )}
              </Box>
              {!data && (
                <Button variant="contained" color="primary" sx={{ mt: 1, mb: 1 }} onClick={fetchData} disabled={loading} fullWidth>
                  {loading ? <CircularProgress size={24} /> : 'Fetch Model Data'}
                </Button>
              )}
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
