import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import { AlgorandClient, Config } from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { DmlChainClient, DmlChainFactory, Classification } from '../contracts/clients/DMLChainClient';

const fixture = algorandFixture();
Config.configure({ populateAppCallResources: true });

let appClient: DmlChainClient;

describe('DML-CHAIN', () => {
  beforeEach(fixture.beforeEach);
  let algorand: AlgorandClient;
  let acc: algosdk.Account;

  beforeAll(async () => {
    await fixture.beforeEach();

    algorand = AlgorandClient.defaultLocalNet();

    const dispenser = await algorand.account.localNetDispenser();

    acc = algosdk.generateAccount();

    algorand.account.setSignerFromAccount(acc);

    await algorand.send.payment({
      sender: dispenser.addr,
      receiver: acc.addr,
      amount: (1000000).algo(),
    });

    const factory = new DmlChainFactory({
      algorand,
      defaultSender: acc.addr,
    });

    const createResult = await factory.send.create.createApplication({ args: { modelHash: 'test' } });
    appClient = createResult.appClient;
  });

  test('assign reward pool to contract', async () => {
    const rewardPoolTxn = await algorand.createTransaction.payment({
      sender: acc.addr,
      receiver: appClient.appAddress,
      amount: (10).algos(),
    });

    const rewardPool = await appClient.send.assignRewardPool({ args: { rewardPoolAmount: 10_000_000, rewardPoolTxn } });
    expect(rewardPool.return).toEqual(10n * 10n ** 6n);
  });

  test('check smart contract balance', async () => {
    await algorand.createTransaction.payment({
      sender: acc.addr,
      receiver: appClient.appAddress,
      amount: (10).algos(),
    });

    const checkBalance = await appClient.send.checkBalance();
    expect(checkBalance.return).toEqual(10n * 10n ** 6n);
  });

  test('reward distribution', async () => {
    const mbrPayFirstDeposit = await algorand.createTransaction.payment({
      sender: acc.addr,
      receiver: appClient.appAddress,
      amount: (1).algo(),
    });

    const classification: Classification = {
      accuracy: 50n,
      precision: 50n,
      recall: 50n,
      f1score: 50n,
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
    expect(reward.return).toEqual([3333333n, 3333333n, 3333333n]);
  });

  test('bulkPayoutRewards distribute rewards to participants', async () => {
    const TESTACC1 = algosdk.generateAccount().addr;
    const TESTACC2 = algosdk.generateAccount().addr;

    const addresses: string[] = [TESTACC1.toString(), TESTACC2.toString()];

    const SIZE = addresses.length;

    const rewards = [1000000n, 2000000n];

    const rewardPoolAmount = 20n;

    const rewardPoolTxn = await algorand.createTransaction.payment({
      sender: acc.addr,
      receiver: appClient.appAddress,
      amount: rewardPoolAmount.algo(),
    });

    await appClient.send.assignRewardPool({
      args: { rewardPoolAmount: rewardPoolAmount * 10n ** 6n, rewardPoolTxn },
    });

    const payout = await appClient.send.bulkPayoutRewards({
      args: {
        addresses,
        rewards,
      },
      extraFee: (0.001 * SIZE).algo(),
    });

    expect(payout.return).toEqual('success');
  });
});
