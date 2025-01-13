import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { DmlChainFactory } from './clients/DMLChainClient';

export const contractDeployer = async (ipfsHash: string) => {
  console.log(ipfsHash);

  const algorand = AlgorandClient.defaultLocalNet();
  algorand.setDefaultValidityWindow(1000);

  const dispenser = await algorand.account.localNetDispenser();

  const acct = algorand.account.random();

  algorand.send.payment({
    sender: dispenser.addr,
    receiver: acct.account.addr,
    amount: (4).algo(),
  });

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: acct.account.addr,
  });

  const { appClient: client } = await factory.deploy();

  const response = await client.send.printHash({ args: { modelHash: 'World' } });

  console.log(response);
};
