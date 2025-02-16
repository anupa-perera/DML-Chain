import LogoutIcon from '@mui/icons-material/Logout'
import { useNetwork, useWallet, Wallet } from '@txnlab/use-wallet-react'
import { ellipseAddress } from '../utils/ellipseAddress'

import { Box, Button, Link, MenuItem, Paper, Select, Typography } from '@mui/material'

const Account = () => {
  const { activeAddress, wallets } = useWallet()

  const { activeNetwork, setActiveNetwork, networkConfig } = useNetwork()

  return (
    <Paper sx={{ p: 1 }}>
      <Box display="flex" flexDirection="column">
        <Link
          href={`https://lora.algokit.io/${activeNetwork}/account/${activeAddress}/`}
          target="_blank"
          underline="hover"
          sx={{ color: '#ff7043' }}
        >
          <Typography variant="h6">Address: {ellipseAddress(activeAddress ?? 'No account')}</Typography>
        </Link>
        <Typography variant="h6" sx={{ color: '#2e7d32' }}>
          Active Network: {activeNetwork.charAt(0).toUpperCase() + activeNetwork.slice(1)}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ color: '#2e7d32' }}>
            Please select the desired network:
          </Typography>
          <Select
            size="small"
            value={activeNetwork}
            onChange={(e) => setActiveNetwork(e.target.value)}
            sx={{ height: 30, width: 120, mt: 1, mb: 1 }}
          >
            {Object.keys(networkConfig).map((id) => (
              <MenuItem key={id} value={id}>
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
            onClick={() => {
              if (wallets) {
                const activeWallet = wallets.find((p: Wallet) => p.isActive)
                if (activeWallet) {
                  activeWallet.disconnect()
                } else {
                  localStorage.removeItem('txnlab-use-wallet')
                  window.location.reload()
                }
              }
            }}
          >
            Logout
          </Button>
        )}
      </Box>
    </Paper>
  )
}

export default Account
