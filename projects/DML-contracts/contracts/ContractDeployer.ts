import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { DmlChainFactory } from './clients/DMLChainClient';

type Classification = {
  accuracy: bigint;
  precision: bigint;
  recall: bigint;
  f1score: bigint;
};

export const contractDeployer = async (ipfsHash: string, modelEval: Classification) => {
  console.log('this is modeleval', modelEval);
  const algorand = AlgorandClient.defaultLocalNet();
  algorand.setDefaultValidityWindow(1000);

  const dispenser = await algorand.account.localNetDispenser();

  const acct = algorand.account.random();

  algorand.send.payment({
    sender: dispenser.addr,
    receiver: acct.account.addr,
    amount: (10).algo(),
  });

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: acct.account.addr,
  });

  const { appClient: client } = await factory.send.create.createApplication({ args: { modelHash: ipfsHash } });

  const printHashResponse = await client.send.printHash();

  console.log('printing', printHashResponse);

  const storeClassMetrics = await client.send.storeClassificationSelectionCriteria({
    args: { evaluationMetrics: modelEval },
  });

  console.log(storeClassMetrics);
};
