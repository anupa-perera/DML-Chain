import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import { encodeAddress } from 'algosdk'
import axios from 'axios'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { DmlChainFactory } from '../contracts/DMLChain'
import { calculateReward, getCreatedListings, isComplete, markContractAsPaid } from '../utils/methods'
import { BACKEND_SERVER, CreatedListingDTO } from '../utils/types'
import Timer from './Timer'
import ValidationForm from './ValidationForm'

export interface ParamsData {
  [address: string]: {
    paramHash: string
    paramKey: string
    score: bigint
    reputation: bigint
  }
}

interface UpdateFetchTrainedModelsInterface {
  openModal: boolean
  closeModal: () => void
}

const FetchTrainedModels = ({ openModal, closeModal }: UpdateFetchTrainedModelsInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [appId, setAppId] = useState<bigint | null>(null)
  const [listings, setListings] = useState<Array<CreatedListingDTO>>([])
  const [paramsData, setParamsData] = useState<ParamsData | null>(null)
  const [displayNotification, setDisplayNotification] = useState<boolean>(false)
  const [showValidation, setShowValidation] = useState<boolean>(false)
  const [awardsDistributed, setAwardsDistributed] = useState<boolean>(false)

  const { transactionSigner, activeAddress, algodClient } = useWallet()

  const algorand = AlgorandClient.fromClients({ algod: algodClient })
  algorand.setDefaultSigner(transactionSigner)

  const handleClose = () => {
    setAppId(null)
    setLoading(false)
    setParamsData(null)
    setListings([])
    setDisplayNotification(false)
    setShowValidation(false)
    setAwardsDistributed(false)
    closeModal()
  }

  const handleGetAllModelParams = async () => {
    if (!appId) {
      enqueueSnackbar('Please Enter a valid contract ID', { variant: 'warning' })
      return
    }
    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }

    const factory = new DmlChainFactory({
      defaultSender: activeAddress,
      algorand,
    })

    try {
      const client = await factory.getAppClientById({ defaultSender: activeAddress, appId: appId })
      const boxIDs = await algorand.app.getBoxNames(appId)

      const paramsMap: Record<string, { paramHash: string; paramKey: string; score: bigint; reputation: bigint }> = {}
      for (const box of boxIDs) {
        if (Object.keys(box.nameRaw).length === 32) {
          try {
            const extAddr = encodeAddress(box.nameRaw)
            const getBox = await client
              .newGroup()
              .getBoxValue({ args: { address: extAddr } })
              .simulate({
                skipSignatures: true,
                allowUnnamedResources: true,
              })

            const getParams = getBox.returns[0]

            if (getParams) {
              paramsMap[extAddr] = {
                paramHash: getParams.paramHash,
                paramKey: getParams.paramKey,
                score: getParams.score,
                reputation: getParams.reputation,
              }
            }
          } catch (error) {
            enqueueSnackbar(`An error has occurred`, { variant: 'error' })
            return
          }
        }
      }

      setParamsData(paramsMap)

      if (paramsData) {
        const filteredParams = Object.fromEntries(
          Object.entries(paramsData).map(([key, value]) => {
            const { paramHash, paramKey } = value
            return [key, { paramHash, paramKey }]
          }),
        )
        await axios.post(`${BACKEND_SERVER}/aggregate`, filteredParams)

        handleClose()
      }
    } catch (error) {
      enqueueSnackbar(`An Error has occurred, ${error}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handlePayoutRewards = async () => {
    if (!appId) {
      enqueueSnackbar('Please Enter a valid contract ID', { variant: 'warning' })
      return
    }
    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }

    if (!paramsData) {
      enqueueSnackbar('No Params Data', { variant: 'warning' })
      return
    }

    const factory = new DmlChainFactory({
      defaultSender: activeAddress,
      algorand,
    })

    try {
      const client = await factory.getAppClientById({ defaultSender: activeAddress, appId: appId })

      const fixedPool = BigInt((await algorand.app.getGlobalState(appId)).rewardPool?.value)

      const baseCriteria = await client
        .newGroup()
        .getClassificationCriteria()
        .simulate({
          skipSignatures: true,
          allowUnnamedResources: true,
        })
        .then((result) => {
          return result.returns[0]
        })

      const { addresses, rewards } = calculateReward(paramsData, fixedPool, baseCriteria!)

      console.log('these are payments', addresses)
      console.log('these are rewards', rewards)

      const SIZE = addresses.length

      await client.send.bulkPayoutRewards({ args: { addresses, rewards }, extraFee: (0.001 * SIZE).algo() })

      await markContractAsPaid(activeAddress, Number(appId))

      setAwardsDistributed(true)
      setShowValidation(true)

      enqueueSnackbar('Rewards have been successfully paid out', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(`An error occurred while paying out rewards: ${error}`, { variant: 'error' })
    }
  }

  const isPaid = () => {
    if (!appId) return false

    const listing = listings.find((listing) => BigInt(listing.contractId) === appId)

    return listing ? listing.paid : false
  }

  useEffect(() => {
    const fetchListings = async () => {
      if (openModal && activeAddress) {
        const listings = await getCreatedListings(activeAddress)
        console.log('listings', listings)

        setListings(listings)
      }
    }

    fetchListings()
  }, [openModal, activeAddress])

  useEffect(() => {
    const fetchparams = async () => {
      if (openModal && appId !== null) {
        handleGetAllModelParams()
      }
    }

    fetchparams()
  }, [appId])

  useEffect(() => {
    if (paramsData !== null) {
      setDisplayNotification(true)
    } else {
      setDisplayNotification(false)
    }
  }, [paramsData])

  return (
    <>
      <Dialog open={openModal} onClose={handleClose}>
        <>
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Fetch Trained Models</DialogTitle>
          <DialogContent>
            {!appId && (
              <Box sx={{ mb: 2, p: 1, maxHeight: '500px', overflow: 'auto' }}>
                <DialogContentText sx={{ mb: 2, textAlign: 'center' }}>
                  Please Click The Desired Listing to download Model Parameters
                </DialogContentText>
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
                          onClick={() => setAppId(BigInt(listing.contractId))}
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
                            pointerEvents: !isComplete(listing.expiresAt) ? 'none' : 'auto',
                            opacity: !isComplete(listing.expiresAt) ? 0.5 : 1,
                          }}
                        >
                          <ListItemText primary={`ID: ${listing.contractId.toString()}`} />
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mr: 2,
                            }}
                          >
                            {!isComplete(listing.expiresAt) && <Timer endDate={listing.expiresAt} />}
                            {listing.paid ? <Typography sx={{ color: 'green', fontWeight: 'bold' }}>PAID</Typography> : null}
                          </Box>
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
                        Please request new model training to display any listing.
                      </DialogContentText>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
            <Box>
              {paramsData && paramsData !== null && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Stored Model Parameters:
                  </Typography>
                  <Box
                    sx={{
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      border: '1px solid #ccc',
                      borderRadius: 2,
                      padding: 1,
                      backgroundColor: '#f9f9f9',
                    }}
                  >
                    {Object.entries(paramsData).map(([key, value]) => (
                      <Box key={key} sx={{ mb: 1, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ minWidth: 80, fontWeight: 'bold' }}>
                            Address
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {key}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ minWidth: 80, fontWeight: 'bold' }}>
                            Hash
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {value.paramHash}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ minWidth: 80, fontWeight: 'bold' }}>
                            Key
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {value.paramKey}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ minWidth: 80, fontWeight: 'bold' }}>
                            Reputation
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {Number(value.reputation)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ minWidth: 80, fontWeight: 'bold' }}>
                            Model Score
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {Number(value.score)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
              {displayNotification && (
                <Box sx={{ border: '2px solid red', borderRadius: 2, mt: 1, color: 'red', textAlign: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">
                    Use this{' '}
                    <Link href={`${BACKEND_SERVER}/data`} target="_blank" rel="noopener noreferrer">
                      end point
                    </Link>{' '}
                    for data aggregation.
                  </Typography>
                </Box>
              )}
            </Box>
            {paramsData && !awardsDistributed && !isPaid() && (
              <Button variant="contained" color="primary" onClick={handlePayoutRewards} disabled={loading} fullWidth>
                {loading ? <CircularProgress size={24} /> : 'Distribute Rewards'}
              </Button>
            )}
            {awardsDistributed ||
              (isPaid() && (
                <Button variant="contained" onClick={handleClose} disabled={loading} color="error" fullWidth>
                  Cancel
                </Button>
              ))}
          </DialogContent>
        </>
      </Dialog>
      {paramsData && <ValidationForm open={showValidation} onClose={() => setShowValidation(false)} addresses={Object.keys(paramsData)} />}
    </>
  )
}

export default FetchTrainedModels
