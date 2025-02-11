import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { Box, Button, Dialog, DialogContent, DialogContentText, DialogTitle, TextField, Typography } from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import { encodeAddress } from 'algosdk'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { DmlChainFactory } from '../contracts/DMLChain'

interface UpdateFetchTrainedModelsInterface {
  openModal: boolean
  closeModal: () => void
}

const FetchTrainedModels = ({ openModal, closeModal }: UpdateFetchTrainedModelsInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [appId, setAppId] = useState<bigint | null>(null)
  const [paramsData, setParamsData] = useState<Record<string, { paramHash: string; paramKey: string }> | null>(null)

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

      const paramsMap: Record<string, { paramHash: string; paramKey: string }> = {}
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

            if (getParams?.paramHash && getParams?.paramKey) {
              paramsMap[extAddr] = {
                paramHash: getParams.paramHash,
                paramKey: getParams.paramKey,
              }
            }

            console.log('Added params for address', extAddr, paramsMap[extAddr])
          } catch (error) {
            console.error(`Error fetching box value for ${box.name}`, error)
          }
        }
      }

      console.log('this is params map', paramsMap)

      setParamsData(paramsMap)
    } catch (error) {
      console.log(error)
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
            {paramsData && (
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
                    </Box>
                  ))}
                </Box>
              </>
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
