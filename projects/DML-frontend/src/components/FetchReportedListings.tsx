import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { Box, Button, Dialog, DialogContent, DialogContentText, DialogTitle, List, ListItem, ListItemText, Typography } from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import { encodeAddress } from 'algosdk'
import axios from 'axios'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { DmlChainFactory } from '../contracts/DMLChain'
import { ellipseAddress } from '../utils/ellipseAddress'
import { calculateReward, getReportedListings } from '../utils/methods'
import { BACKEND_SERVER, ReportedListing } from '../utils/types'

interface FetchReportedListingsInterface {
  openModal: boolean
  closeModal: () => void
}

const FetchReportedListings = ({ openModal, closeModal }: FetchReportedListingsInterface) => {
  const { activeAddress, algodClient, transactionSigner } = useWallet()
  const [listings, setListings] = useState<Array<ReportedListing>>([])
  const [selectedListing, setSelectedListing] = useState<ReportedListing | null>(null)

  const algorand = AlgorandClient.fromClients({ algod: algodClient })
  algorand.setDefaultSigner(transactionSigner)

  const handleClose = () => {
    closeModal()
    setSelectedListing(null)
  }

  const handleListingClick = async (listing: ReportedListing) => {
    setSelectedListing(listing)
  }

  const handleReleaseRewards = async (contractId: number) => {
    const appId = BigInt(contractId)
    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }

    const factory = new DmlChainFactory({
      defaultSender: activeAddress,
      algorand,
    })

    try {
      const client = await factory.getAppClientById({ defaultSender: activeAddress, appId })
      const boxIDs = await algorand.app.getBoxNames(BigInt(contractId))

      const paramsMap: Record<string, { paramHash: string; paramKey: string; score: bigint; reputation: bigint }> = {}

      for (const box of boxIDs) {
        if (Object.keys(box.nameRaw).length === 32) {
          try {
            const extAddr = encodeAddress(box.nameRaw)
            const getBox = await client
              .newGroup()
              .adminGetBoxValue({ args: { address: extAddr } })
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
            enqueueSnackbar(`Error processing box: ${error instanceof Error ? error.message : 'Unknown error'}`, {
              variant: 'error',
            })
          }
        }
      }

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

      const { addresses, rewards } = calculateReward(paramsMap, fixedPool, baseCriteria!)

      const SIZE = addresses.length

      await client.send.delete.adminBulkPayoutRewards({ args: { addresses, rewards }, extraFee: (0.001 * SIZE + 0.001).algo() })

      await axios.post(`${BACKEND_SERVER}/update-reported-listing-status`, {
        contractId,
        status: 'paid',
      })

      const reportedListings = await getReportedListings()
      setListings(reportedListings)
      setSelectedListing(null)
    } catch (error) {
      enqueueSnackbar(`Failed to release rewards: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        variant: 'error',
      })
    }
  }

  useEffect(() => {
    const fetchListings = async () => {
      if (openModal) {
        try {
          const reportedListings = await getReportedListings()
          setListings(reportedListings)
        } catch (error) {
          enqueueSnackbar(`Failed to fetch reported listings: ${error instanceof Error ? error.message : 'Unknown error'}`, {
            variant: 'error',
          })
        }
      }
    }

    fetchListings()
  }, [openModal])

  return (
    <>
      <Dialog open={openModal} onClose={handleClose}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', padding: 1 }}>View Reported Model Listings</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1, maxHeight: '500px', overflow: 'auto' }}>
            <Box sx={{ borderRadius: '4px', overflow: 'auto', width: '500px' }}>
              {listings.length > 0 ? (
                <List sx={{ width: '100%', maxHeight: 300 }}>
                  {listings.map((listing) => (
                    <ListItem
                      key={listing.contractId.toString()}
                      onClick={() => handleListingClick(listing)}
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
                    >
                      <ListItemText primary={`ID: ${listing.contractId.toString()}`} />
                      {listing.status === 'paid' ? <Typography sx={{ color: 'green', fontWeight: 'bold', ml: 2 }}>PAID</Typography> : null}
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
                  <DialogContentText>No reported listings found.</DialogContentText>
                  <DialogContentText sx={{ mt: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                    There are currently no reported model listings.
                  </DialogContentText>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedListing)}
        onClose={() => setSelectedListing(null)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: '400px',
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: 'center',
            fontWeight: 'bold',
            bgcolor: 'primary.main',
            color: 'white',
            py: 2,
          }}
        >
          Listing Details - ID: {selectedListing?.contractId}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedListing ? (
            <Box sx={{ p: 2 }}>
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1,
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                  Basic Information
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <strong>Model Owner:</strong>
                  <span>{ellipseAddress(selectedListing?.creatorAddress)}</span>
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <strong>Created:</strong>
                  <span>{selectedListing && new Date(selectedListing.reportedAt).toLocaleString()}</span>
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <strong>Status:</strong>
                  <Typography
                    component="span"
                    sx={{
                      color: selectedListing?.status === 'Active' ? 'success.main' : 'error.main',
                    }}
                  >
                    {selectedListing?.status}
                  </Typography>
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1,
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                  Data Owners ({selectedListing?.subscriberAddresses?.length || 0})
                </Typography>
                {selectedListing?.subscriberAddresses && (
                  <List
                    dense
                    sx={{
                      maxHeight: '150px',
                      overflow: 'auto',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    {selectedListing.subscriberAddresses.map((address, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          borderBottom: index !== selectedListing.subscriberAddresses.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <ListItemText
                          primary={ellipseAddress(address)}
                          sx={{
                            '& .MuiTypography-root': {
                              fontFamily: 'monospace',
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                {selectedListing?.status !== 'paid' && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => selectedListing && handleReleaseRewards(selectedListing.contractId)}
                    fullWidth
                  >
                    Release Rewards
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <DialogContentText>Loading listing details...</DialogContentText>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FetchReportedListings
