import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import * as algokit from '@algorandfoundation/algokit-utils';
import { encodeAddress } from 'algosdk';
import { DmlChainFactory } from './clients/DMLChainClient';

type Classification = {
  accuracy: bigint;
  precision: bigint;
  recall: bigint;
  f1score: bigint;
};

type ParamsData = {
  paramHash: string;
  paramKey: string;
};

export const contractDeployer = async (
  ipfsHash: string,
  modelEvaluation: Classification,
  ParameterData: ParamsData
) => {
  console.log('these are params', ParameterData);
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

  const appID = client.appId;

  console.log('this is app ID', appID);

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

  console.log(performMetricEvaluation.return);

  const modelParamBox = await algorand.createTransaction.payment({
    sender: acct.account.addr,
    receiver: client.appAddress,
    amount: (1).algo(),
  });

  const storeModelParameters = await client.send.storeModelParams({
    args: { mbrPay: modelParamBox, address: acct.account.addr, paramsData: ParameterData },
  });

  console.log('storing model params', storeModelParameters);

  const boxIDs = await algorand.app.getBoxNames(appID);

  const boxes = await client.appClient.getBoxNames();
  console.log('Boxes:', boxes);

  console.log('ÍDs', boxIDs);

  boxIDs.forEach(async (box) => {
    if (Object.keys(box.nameRaw).length === 32) {
      try {
        const extAddr = encodeAddress(box.nameRaw);
        console.log(extAddr, 'this is ext addr');
        const getParams = await (await client.send.getBoxValue({ args: { address: extAddr } })).return;
        const paramHash = getParams?.paramHash;
        const paramKey = getParams?.paramKey;
        console.log(paramHash, paramKey);
      } catch (error) {
        console.error(`Error fetching box value for ${box.name}`, error);
      }
    } else {
      console.warn(`Skipped API call for box with name: ${box.name} due to being <32 for address type`);
    }
  });
};
