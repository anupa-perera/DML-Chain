import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import { Config } from '@algorandfoundation/algokit-utils';
import { DmlChainClient, DmlChainFactory } from '../contracts/clients/DMLChainClient';

const fixture = algorandFixture();
Config.configure({ populateAppCallResources: true });

let appClient: DmlChainClient;

describe('HelloWorld', () => {
  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount } = fixture.context;
    const { algorand } = fixture;

    const factory = new DmlChainFactory({
      algorand,
      defaultSender: testAccount.addr,
    });

    const createResult = await factory.send.create.createApplication({ args: { modelHash: 'test' } });
    appClient = createResult.appClient;
  });

  test('reward distribution', async () => {
    const reward = await appClient.send.distributeRewards();
    expect(reward).toBe(true);
  });
});
