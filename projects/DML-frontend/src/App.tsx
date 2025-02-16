import * as algokit from '@algorandfoundation/algokit-utils'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import Home from './Home'

algokit.Config.configure({
  populateAppCallResources: true,
})

export default function App() {
  const walletManager = new WalletManager({
    wallets: [
      {
        id: WalletId.LUTE,
        options: { siteName: 'DML-CHAIN' },
      },
      WalletId.DEFLY,
      WalletId.PERA,
      WalletId.MNEMONIC,
    ],
    defaultNetwork: NetworkId.LOCALNET,
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <Home />
      </WalletProvider>
    </SnackbarProvider>
  )
}
