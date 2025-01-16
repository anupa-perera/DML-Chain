import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import * as algokit from '@algorandfoundation/algokit-utils';
import { DmlChainFactory } from './clients/DMLChainClient';

type Classification = {
  accuracy: bigint;
  precision: bigint;
  recall: bigint;
  f1score: bigint;
};

export const contractDeployer = async (ipfsHash: string, modelEvaluation: Classification) => {
  const algorand = AlgorandClient.defaultLocalNet();
  algorand.setDefaultValidityWindow(1000);

  const dispenser = await algorand.account.localNetDispenser();

  algokit.Config.configure({
    populateAppCallResources: true,
  });

  const acct = algorand.account.random();

  algorand.send.payment({
    sender: dispenser.addr,
    receiver: acct.account.addr,
    amount: (10).algo(),
  });

  const factory = algorand.client.getTypedAppFactory(DmlChainFactory, {
    defaultSender: acct.account.addr,
  });

  algokit.Config.configure({
    populateAppCallResources: true,
  });

  const { appClient: client } = await factory.send.create.createApplication({ args: { modelHash: ipfsHash } });

  const mbrPayFirstDeposit = await algorand.createTransaction.payment({
    sender: acct.account.addr,
    receiver: client.appAddress,
    amount: (1).algo(),
  });

  const createBox = await client.send
    .storeClassificationSelectionCriteria({
      args: {
        evaluationMetrics: modelEvaluation,
        mbrPay: mbrPayFirstDeposit,
      },
    })
    .then((response) => response.confirmation);

  console.log('this is create box', createBox);

  const getBox = await client.send.getClassificationCriteria();

  console.log('this is getbox', getBox.return);

  const performMetricEvaluation = await client.send.classModelSelectionCriteria({
    args: { modelEvaluationMetrics: modelEvaluation },
  });

  console.log('this is evaluation', performMetricEvaluation.return);
};
