import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils';
import algosdk, { Transaction } from 'algosdk';
import { DmlChainClient, DmlChainFactory, Classification } from '../contracts/clients/DMLChainClient';

const fixture = algorandFixture();
Config.configure({ populateAppCallResources: true });

let appClient: DmlChainClient;

describe('HelloWorld', () => {
  beforeEach(fixture.beforeEach);
  let algorand: AlgorandClient;
  let acc: algosdk.Account;

  beforeAll(async () => {
    await fixture.beforeEach();
    algorand = AlgorandClient.defaultLocalNet();

    const dispenser = await algorand.account.localNetDispenser();

    acc = algosdk.generateAccount();

    const signer = {
      addr: acc.addr,
      signer: async (txnGroup: Transaction[]) => {
        return txnGroup.map((tx) => tx.signTxn(acc.sk));
      },
    };

    await algorand.send.payment({
      sender: dispenser.addr,
      receiver: acc.addr,
      amount: (10).algo(),
    });

    const factory = new DmlChainFactory({
      algorand,
      defaultSender: acc.addr,
    });

    algorand.setDefaultSigner(signer.signer);

    const createResult = await factory.send.create.createApplication({ args: { modelHash: 'test' } });
    appClient = createResult.appClient;
  });

  test('reward distribution', async () => {
    const mbrPayFirstDeposit = await algorand.createTransaction.payment({
      sender: acc.addr,
      receiver: appClient.appAddress,
      amount: (1).algo(),
    });

    const classification: Classification = {
      accuracy: BigInt(50),
      precision: BigInt(50),
      recall: BigInt(50),
      f1score: BigInt(50),
    };

    await appClient.send.storeClassificationSelectionCriteria({
      args: {
        evaluationMetrics: classification,
        mbrPay: mbrPayFirstDeposit,
      },
    });

    const reward = await appClient.send.distributeRewards({
      args: { contributor: { score: BigInt(300) } },
    });
    expect(reward.return).toBe(BigInt(100));
  });
});
