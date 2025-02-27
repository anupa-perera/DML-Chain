import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import { Box, Dialog, DialogContent, DialogContentText, DialogTitle, IconButton, List, ListItem, ListItemText } from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEffect, useState } from 'react'
import { getSubscribedListings, isComplete, updateReputation } from '../utils/methods'
import { ReputationType, SubscribedListingDTO } from '../utils/types'
import Timer from './Timer'

interface FetchSubscribedListingsInterface {
  openModal: boolean
  closeModal: () => void
}

const FetchSubscribedListings = ({ openModal, closeModal }: FetchSubscribedListingsInterface) => {
  const handleClose = () => {
    closeModal()
  }

  const { activeAddress } = useWallet()

  const [listings, setListings] = useState<Array<SubscribedListingDTO>>([])

  const sendFeedback = async (creatorAddress: string, action: ReputationType) => {
    await updateReputation(creatorAddress, action)
  }

  useEffect(() => {
    const fetchListings = async () => {
      if (openModal && activeAddress) {
        const listings = await getSubscribedListings(activeAddress)
        setListings(listings)
      }
    }

    fetchListings()
  }, [openModal, activeAddress])
  return (
    <Dialog open={openModal} onClose={handleClose}>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', padding: 1 }}>View Subscribed Model Listings</DialogTitle>
      <DialogContent>
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
                      isComplete(listing.expiresAt) ? (
                        <Box sx={{ display: 'flex' }}>
                          <IconButton
                            size="small"
                            sx={{
                              ml: 1,
                              color: 'primary.main',
                              '&:hover': { color: 'primary.dark' },
                            }}
                            onClick={() => {
                              sendFeedback(listing.creatorAddress, ReputationType.MERIT)
                            }}
                            title="Merit Icon"
                          >
                            <ThumbUpIcon sx={{ color: 'green' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{
                              mr: 1,
                              color: 'success.main',
                              '&:hover': { color: 'success.dark' },
                            }}
                            onClick={() => sendFeedback(listing.creatorAddress, ReputationType.DEMERIT)}
                            title="Demerit Icon"
                          >
                            <ThumbDownIcon sx={{ color: 'red' }} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mr: 2,
                          }}
                        >
                          <Timer endDate={listing.expiresAt} />
                        </Box>
                      )
                    }
                  >
                    <ListItemText
                      primary={`ID: ${listing.contractId.toString()}`}
                      secondary={
                        <>
                          <span
                            style={{
                              color: listing.reputation > 75 ? '#2e7d32' : listing.reputation > 50 ? '#ffeb3b' : '#f50057',
                            }}
                          >
                            {`Reputation: ${listing.reputation || 'N/A'}`}
                          </span>
                        </>
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
                  Please subscribe to a model to display any listing.
                </DialogContentText>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default FetchSubscribedListings
