import { Contract } from '@algorandfoundation/tealscript';

// const COST_PER_BYTE = 400;
// const COST_PER_BOX = 2500;
// // const MAX_BOX_SIZE = 32768;
// const BOX_SIZE_BYTES = 32;

const boxMbr = 1_000_000;

type Classification = {
  accuracy: uint64;
  precision: uint64;
  recall: uint64;
  f1score: uint64;
};

type ParamsData = {
  paramHash: string;
  paramKey: string;
  score: uint64;
  reputation: uint64;
};

export class DMLChain extends Contract {
  // store hash on global state
  ipfsHash = GlobalStateKey<string>({ key: 'ipfsHash' });

  // store reward pool amount
  rewardPool = GlobalStateKey<uint64>({ key: 'rewardPool' });

  // store stake amount
  stakeAmount = GlobalStateKey<uint64>({ key: 'stakeAmount' });

  // store params in BoxMap
  paramsData = BoxMap<Address, ParamsData>({ allowPotentialCollisions: true });

  // store selection criteria in BoxMap
  classificationPerformanceMetrics = BoxMap<string, Classification>({ allowPotentialCollisions: true });

  // assign hash to global state
  createApplication(modelHash: string): void {
    this.ipfsHash.value = modelHash;
  }

  // update model data
  updateApplication(modelHash: string): void {
    assert(this.txn.sender === this.app.creator);
    this.ipfsHash.value = modelHash;
  }

  // assign reward pool to smart contract
  assignRewardPool(rewardPoolAmount: uint64, rewardPoolTxn: PayTxn): uint64 {
    verifyPayTxn(rewardPoolTxn, {
      sender: this.txn.sender,
      receiver: this.app.address,
      amount: rewardPoolAmount,
    });
    this.rewardPool.value = rewardPoolAmount;
    this.stakeAmount.value = wideRatio([rewardPoolAmount], [2]);
    return 1;
  }

  // creator commit to listing by staking
  creatorCommitToListing(stakeAmountTxn: PayTxn): uint64 {
    assert(this.txn.sender === this.app.creator);
    verifyPayTxn(stakeAmountTxn, {
      sender: this.txn.sender,
      receiver: this.app.address,
      amount: this.stakeAmount.value,
    });

    return 1;
  }

  // commit to listing by staking
  commitToListing(stakeAmountTxn: PayTxn): uint64 {
    verifyPayTxn(stakeAmountTxn, {
      sender: this.txn.sender,
      receiver: this.app.address,
      amount: this.stakeAmount.value,
    });

    return 1;
  }

  // check contract balance
  checkBalance(): uint64 {
    return this.app.address.balance;
  }

  // bulk reward pay
  @allow.call('DeleteApplication')
  bulkPayoutRewards(addresses: Address[], rewards: uint64[]): uint64 {
    assert(this.txn.sender === this.app.creator);
    assert(addresses.length === rewards.length, 'Arrays must have the same length');

    let totalReward = 0;
    for (let i = 0; i < rewards.length; i += 1) {
      totalReward += rewards[i];
    }

    const totalStakeAmount = wideRatio([addresses.length, this.stakeAmount.value], [1]);

    const totalPayout = totalReward + totalStakeAmount;

    assert(this.app.address.balance >= totalPayout, 'Insufficient balance for rewards');

    for (let i = 0; i < addresses.length; i += 1) {
      sendPayment({
        amount: rewards[i] + this.stakeAmount.value,
        receiver: addresses[i],
        note: 'reward',
      });
    }

    for (let i = 0; i < addresses.length; i += 1) {
      this.deleteBox(addresses[i]);
    }

    this.deleteApplication();

    return 1;
  }

  // bulk reward pay
  @allow.call('DeleteApplication')
  adminBulkPayoutRewards(addresses: Address[], rewards: uint64[]): uint64 {
    assert(addresses.length === rewards.length, 'Arrays must have the same length');

    let totalReward = 0;
    for (let i = 0; i < rewards.length; i += 1) {
      totalReward += rewards[i];
    }

    const totalStakeAmount = wideRatio([addresses.length, this.stakeAmount.value], [1]);

    const totalPayout = totalReward + totalStakeAmount;

    assert(this.app.address.balance >= totalPayout, 'Insufficient balance for rewards');

    let unitaryCreatorDistributeStake = 0;

    if (addresses.length > 0) {
      unitaryCreatorDistributeStake = wideRatio([this.app.address.balance - totalPayout], [addresses.length]);
    }

    for (let i = 0; i < addresses.length; i += 1) {
      sendPayment({
        amount: rewards[i] + this.stakeAmount.value + unitaryCreatorDistributeStake,
        receiver: addresses[i],
        note: 'reward',
      });
    }

    for (let i = 0; i < addresses.length; i += 1) {
      this.deleteBox(addresses[i]);
    }

    this.adminDeleteApplication();

    return 1;
  }

  // store classification model selection criteria
  storeClassificationSelectionCriteria(evaluationMetrics: Classification, mbrPay: PayTxn): void {
    verifyTxn(this.txn, { sender: this.app.creator });
    verifyPayTxn(mbrPay, {
      sender: this.txn.sender,
      receiver: this.app.address,
      amount: boxMbr,
    });

    this.classificationPerformanceMetrics('InitialModelMetrics').create(32);
    this.classificationPerformanceMetrics('InitialModelMetrics').value = evaluationMetrics;
  }

  // get classification criteria
  getClassificationCriteria(): Classification {
    assert(this.classificationPerformanceMetrics('InitialModelMetrics').exists);
    return this.classificationPerformanceMetrics('InitialModelMetrics').value;
  }

  // model selection criteria for classification models
  classModelSelectionCriteria(modelEvaluationMetrics: Classification): uint64 {
    assert(this.classificationPerformanceMetrics('InitialModelMetrics').exists);
    const baselineClassMetrics = this.classificationPerformanceMetrics('InitialModelMetrics').value;

    const baselineScore =
      baselineClassMetrics.accuracy +
      baselineClassMetrics.precision +
      baselineClassMetrics.recall +
      baselineClassMetrics.f1score;

    const modelScore =
      modelEvaluationMetrics.accuracy +
      modelEvaluationMetrics.precision +
      modelEvaluationMetrics.recall +
      modelEvaluationMetrics.f1score;

    if (modelScore <= baselineScore) {
      return 0;
    }

    return modelScore - baselineScore;
  }

  // store model parameters
  storeModelParams(mbrPay: PayTxn, Address: Address, paramsData: ParamsData): void {
    if (this.paramsData(Address).exists) {
      verifyTxn(this.txn, { sender: this.txn.sender });
      verifyPayTxn(mbrPay, {
        sender: this.txn.sender,
        receiver: this.app.address,
        amount: boxMbr,
      });

      this.paramsData(Address).value = paramsData;
    } else {
      verifyTxn(this.txn, { sender: this.txn.sender });
      verifyPayTxn(mbrPay, {
        sender: this.txn.sender,
        receiver: this.app.address,
        amount: boxMbr,
      });

      this.paramsData(Address).create(32);
      this.paramsData(Address).value = paramsData;
    }
  }

  // get model params by address reference
  getBoxValue(Address: Address): ParamsData {
    verifyTxn(this.txn, { sender: this.app.creator });
    assert(this.paramsData(Address).exists);
    return this.paramsData(Address).value;
  }

  // get model params by address reference by the admin
  adminGetBoxValue(Address: Address): ParamsData {
    assert(this.paramsData(Address).exists);
    return this.paramsData(Address).value;
  }

  // delete initial box
  deleteInitialBox(): void {
    if (this.classificationPerformanceMetrics('InitialModelMetrics').exists) {
      this.classificationPerformanceMetrics('InitialModelMetrics').delete();
    }
  }

  // delete box
  deleteBox(address: Address): uint64 {
    if (this.classificationPerformanceMetrics('InitialModelMetrics').exists) {
      this.classificationPerformanceMetrics('InitialModelMetrics').delete();
    }
    if (this.paramsData(address).exists) {
      this.paramsData(address).delete();
    }
    return 1;
  }

  //  delete contract
  deleteApplication(): void {
    assert(this.txn.sender === this.app.creator);

    sendPayment({
      closeRemainderTo: this.txn.sender,
    });
  }

  //  admin delete contract
  adminDeleteApplication(): void {
    sendPayment({
      closeRemainderTo: this.txn.sender,
    });
  }
}
