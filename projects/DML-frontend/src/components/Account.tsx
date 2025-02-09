import LogoutIcon from '@mui/icons-material/Logout'
import { useWallet, Wallet } from '@txnlab/use-wallet-react'
import { useMemo } from 'react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

import { Box, Button, Link, Paper, Typography } from '@mui/material'

const Account = () => {
  const { activeAddress, wallets } = useWallet()
  const algoConfig = getAlgodConfigFromViteEnvironment()

  const networkName = useMemo(() => {
    return algoConfig.network === '' ? 'localnet' : algoConfig.network.toLocaleLowerCase()
  }, [algoConfig.network])

  return (
    <Paper sx={{ p: 1 }}>
      <Box display="flex" flexDirection="column">
        <Link
          href={`https://lora.algokit.io/${networkName}/account/${activeAddress}/`}
          target="_blank"
          underline="hover"
          sx={{ color: '#ff7043' }}
        >
          <Typography variant="h6">Address: {ellipseAddress(activeAddress ?? 'No account')}</Typography>
        </Link>
        <Typography variant="h6" sx={{ color: '#2e7d32' }}>
          Network: {networkName}
        </Typography>
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
