import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { DmlChainClient } from './clients/DMLChainClient';

export const contractDeployer = async (ipfsHash: string, modelParameters: string) => {
  console.log(ipfsHash + modelParameters);

  const algorand = AlgorandClient.defaultLocalNet();
  algorand.setDefaultValidityWindow(1000);

  const dispenser = await algorand.account.localNetDispenser();

  const acct = algorand.account.random();

  algorand.send.payment({
    sender: dispenser.addr,
    receiver: acct.account.addr,
    amount: (4).algo(),
  });

  const app_client = DmlChainClient.
};
