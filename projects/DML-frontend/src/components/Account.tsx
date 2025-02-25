import LogoutIcon from '@mui/icons-material/Logout'
import { NetworkId, useNetwork, useWallet } from '@txnlab/use-wallet-react'
import { ellipseAddress } from '../utils/ellipseAddress'

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { Box, Button, Link, MenuItem, Paper, Select, Typography } from '@mui/material'
import axios from 'axios'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { BACKEND_SERVER } from '../utils/types'

const Account = () => {
  const { activeAddress, algodClient, activeWallet } = useWallet()

  const { activeNetwork, setActiveNetwork, networkConfig } = useNetwork()
  const [balance, setBalance] = useState<number>(0)
  const [reputation, setReputation] = useState<number | null>(null)
  const { enqueueSnackbar } = useSnackbar()

  const algorand = AlgorandClient.fromClients({ algod: algodClient })

  const handleDisconnect = async () => {
    if (!activeWallet) return
    try {
      await setActiveNetwork(NetworkId.LOCALNET)
      activeWallet.disconnect()
    } catch (err) {
      enqueueSnackbar(`${err}`, { variant: 'warning' })
    }
  }

  const getAddressInfo = async () => {
    if (!activeAddress) {
      return
    }

    const accountInfo = await algorand.account.getInformation(activeAddress)
    const balance = accountInfo.balance.algos
    setTimeout(async () => {
      const getDataResponse = await axios.get(`${BACKEND_SERVER}/get-user/${activeAddress}`)
      const reputation = await getDataResponse.data.reputation
      setReputation(reputation)
    }, 1000)

    setBalance(balance)
  }

  useEffect(() => {
    getAddressInfo()
  }, [activeNetwork, activeAddress])

  return (
    <Paper sx={{ p: 1, border: '0.5px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
      <Box display="flex" flexDirection="column" sx={{ justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {activeWallet && (
            <Box
              component="img"
              src={activeWallet.metadata.icon}
              alt={`wallet_icon_${activeWallet.metadata.name}`}
              sx={{
                width: 80,
                height: 100,
                objectFit: 'contain',
                mr: 1,
                p: 1,
              }}
            />
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', margin: 0 }}>
            <Typography
              variant="h5"
              sx={{
                color: '#ff7043',
                mt: 1,
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Account Information
            </Typography>
            <Link
              href={`https://lora.algokit.io/${activeNetwork}/account/${activeAddress}/`}
              target="_blank"
              underline="hover"
              sx={{ color: '#2e7d32', fontFamily: 'Arial, sans-serif' }}
            >
              <Typography>Address: {ellipseAddress(activeAddress ?? 'No account')}</Typography>
            </Link>{' '}
            <Typography sx={{ color: '#2e7d32', fontFamily: 'Arial, sans-serif' }}>
              Active Network: {activeNetwork.charAt(0).toUpperCase() + activeNetwork.slice(1)}
            </Typography>
            <Typography sx={{ color: '#2e7d32', fontFamily: 'Arial, sans-serif' }}>Balance: {balance} ALGO</Typography>
            {reputation === null ? (
              <Typography sx={{ color: '#2e7d32', fontFamily: 'Arial, sans-serif' }}>Loading...</Typography>
            ) : (
              <Typography
                sx={{
                  color: reputation > 75 ? '#2e7d32' : reputation > 50 ? '#ffeb3b' : '#f50057',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Reputation: {reputation} HP
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Select
            size="small"
            value={activeNetwork}
            onChange={(e) => setActiveNetwork(e.target.value)}
            sx={{ height: 30, width: 120, mt: 1, mb: 1 }}
          >
            {Object.keys(networkConfig).map((id) => (
              <MenuItem key={id} value={id} sx={{ fontFamily: 'Arial, sans-serif' }}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 1 }}>
        {activeAddress && (
          <Button
            variant="contained"
            color="error"
            data-test-id="logout"
            startIcon={<LogoutIcon />}
            onClick={handleDisconnect}
            sx={{ textTransform: 'none' }}
          >
            Disconnect Wallet
          </Button>
        )}
      </Box>
    </Paper>
  )
}

export default Account
