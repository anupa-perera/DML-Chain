import * as algokit from '@algorandfoundation/algokit-utils'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import Home from './Home'
import './styles/main.css'

algokit.Config.configure({
  populateAppCallResources: true,
})

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
  options: {
    resetNetwork: true,
  },
})

export default function App() {
  return (
    <SnackbarProvider maxSnack={2}>
      <WalletProvider manager={walletManager}>
        <Home />
      </WalletProvider>
    </SnackbarProvider>
  )
}
