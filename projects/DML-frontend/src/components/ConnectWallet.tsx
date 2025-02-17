import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import { useWallet } from '@txnlab/use-wallet-react'
import Account from './Account'

const ConnectWallet = () => {
  const { activeAddress, wallets } = useWallet()

  return (
    <Box>
      <Box sx={{ my: 3 }}>
        {activeAddress && (
          <>
            <Account />
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {!activeAddress && (
          <Stack spacing={2}>
            {wallets?.map((wallet) => (
              <Button
                variant="outlined"
                data-test-id={`${wallet.metadata.name}-connect`}
                key={`provider-${wallet.metadata.name}`}
                onClick={() => wallet.connect()}
                sx={{
                  borderColor: '#9e9e9e',
                  textTransform: 'none',
                  fontFamily: 'Arial, sans-serif',
                }}
                disableRipple
              >
                <Box
                  component="img"
                  src={wallet.metadata.icon}
                  alt={`wallet_icon_${wallet.metadata.name}`}
                  sx={{
                    width: 30,
                    height: 'auto',
                    objectFit: 'contain',
                    mr: 2,
                  }}
                />
                <Typography>{wallet.metadata.name}</Typography>
              </Button>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  )
}

export default ConnectWallet
