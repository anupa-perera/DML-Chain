import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { useState } from 'react'

const Txn = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [receiverAddress, setReceiverAddress] = useState<string>('')

  const { enqueueSnackbar } = useSnackbar()

  const { transactionSigner, activeAddress, algodClient } = useWallet()

  const handleSubmitAlgo = async () => {
    setLoading(true)

    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }

    try {
      const atc = new algosdk.AtomicTransactionComposer()
      const suggestedParams = await algodClient.getTransactionParams().do()

      const transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: receiverAddress,
        amount: 1,
        suggestedParams,
      })

      atc.addTransaction({ txn: transaction, signer: transactionSigner })

      enqueueSnackbar(`[App] Sending transaction...`, { variant: 'info' })

      const result = await atc.execute(algodClient, 4)

      enqueueSnackbar(`Transaction sent: ${(result.confirmedRound, result.txIDs)}`, { variant: 'success' })
      setReceiverAddress('')
    } catch (e) {
      enqueueSnackbar('Failed to send transaction', { variant: 'error' })
    }

    setLoading(false)
  }

  return (
    <div className="container mx-auto p-4 bg-slate-200">
      <h3 className="font-bold text-lg">Send payment transaction</h3>
      <br />
      <input
        type="text"
        data-test-id="receiver-address"
        placeholder="Provide wallet address"
        className="input input-bordered w-full"
        value={receiverAddress}
        onChange={(e) => {
          setReceiverAddress(e.target.value)
        }}
      />
      <div className="mt-4">
        <button
          data-test-id="send-algo"
          className={`btn ${receiverAddress.length === 58 ? '' : 'btn-disabled'}`}
          onClick={handleSubmitAlgo}
        >
          {loading ? <span className="loading loading-spinner" /> : 'Send 1 Algo'}
        </button>
      </div>
    </div>
  )
}

export default Txn
