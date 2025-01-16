import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils';
import { DmlChainFactory } from './clients/DMLChainClient';

// type Classification = {
//   accuracy: bigint;
//   precision: bigint;
//   recall: bigint;
//   f1score: bigint;
// };

export const contractDeployer = async (ipfsHash: string) => {
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

  console.log('printing', printHashResponse.returns);

  console.log('this is acc', client.appAddress);
  const mbrPayFirstDeposit = await algorand.createTransaction.payment({
    sender: acct.account.addr,
    receiver: client.appAddress,
    amount: microAlgos(500_000),
  });

  const createBox = await client.send.createBox({
    args: {
      mbrPay: mbrPayFirstDeposit,
    },
  });

  console.log('this is create box', createBox);

  // const storeClassMetrics = await client.send.storeClassificationSelectionCriteria({
  //   args: { evaluationMetrics: modelEval },
  // });

  // console.log(storeClassMetrics);
};
