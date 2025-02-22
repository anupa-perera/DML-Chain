import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { Box, Button, Dialog, DialogContent, DialogContentText, DialogTitle, Link, TextField, Typography } from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import { encodeAddress } from 'algosdk'
import axios from 'axios'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { DmlChainFactory } from '../contracts/DMLChain'
import { calculateReward } from '../utils/methods'

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

  const [paramsData, setParamsData] = useState<ParamsData | null>(null)
  const [displayNotification, setDisplayNotification] = useState<boolean>(false)

  const { transactionSigner, activeAddress, algodClient } = useWallet()

  const algorand = AlgorandClient.fromClients({ algod: algodClient })
  algorand.setDefaultSigner(transactionSigner)

  const handleClose = () => {
    setAppId(null)
    setLoading(false)
    setParamsData(null)
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
            enqueueSnackbar('Error fetching box value for this listing', { variant: 'error' })
            return
          }
        }
      }

      setParamsData(paramsMap)

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

      if (paramsData && fixedPool && baseCriteria) {
        const { addresses, rewards } = calculateReward(paramsData, fixedPool, baseCriteria)

        const SIZE = addresses.length

        await client.send.bulkPayoutRewards({ args: { addresses, rewards }, extraFee: (0.001 * SIZE).algo() })
      }

      if (paramsData) {
        const filteredParams = Object.fromEntries(
          Object.entries(paramsData).map(([key, value]) => {
            const { paramHash, paramKey } = value
            return [key, { paramHash, paramKey }]
          }),
        )
        await axios.post('http://127.0.0.1:5000/aggregate', filteredParams)
        setDisplayNotification(true)
        setTimeout(() => {
          setDisplayNotification(false)
          handleClose()
        }, 10000)
      }

      enqueueSnackbar('Model Parameters has been successfully stored for aggregation', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar('Error connecting to the end point', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={openModal} onClose={handleClose}>
      <>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Fetch Trained Models</DialogTitle>
        <DialogContent>
          <DialogContentText>Please Enter The Contract ID fetch the collected parameter data</DialogContentText>
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
          />
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
              <Box sx={{ border: '2px solid red', borderRadius: 2, p: 2, mt: 2, color: 'red' }}>
                <Typography align="left" variant="subtitle2">
                  Please fetch your model parameters from this{' '}
                  <Link href="http://localhost:5000/data" target="_blank" rel="noopener noreferrer">
                    end point
                  </Link>{' '}
                  for your preferred aggregation. This window will close shortly.
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Button onClick={handleGetAllModelParams} disabled={loading} variant="contained" color="primary">
              {loading ? 'Downloading...' : 'Download Model Parameters'}
            </Button>
            <Button variant="contained" onClick={handleClose} disabled={loading} color="error">
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </>
    </Dialog>
  )
}

export default FetchTrainedModels
