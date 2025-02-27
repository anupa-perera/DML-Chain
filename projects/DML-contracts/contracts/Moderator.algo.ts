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

type Regression = {
  MSE: uint64;
  RMSE: uint64;
  MAE: uint64;
  COD: uint64;
};

type rewardCalculation = {
  score: uint64;
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

  // Store params in BoxMap
  paramsData = BoxMap<Address, ParamsData>({ allowPotentialCollisions: true });

  // store selection criteria in BoxMap
  regressionPerformanceMetrics = BoxMap<string, Regression>({ allowPotentialCollisions: true });

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

  // payout rewards to relevant addresses
  payoutRewards(Address: Address, reward: uint64): string {
    sendPayment({
      amount: reward,
      receiver: Address,
      note: 'reward',
    });

    return 'success';
  }

  // bulk reward pay
  bulkPayoutRewards(addresses: Address[], rewards: uint64[]): uint64 {
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

  // store Regression model selection criteria
  storeModelRegressionSelectionCriteria(evaluationMetrics: Regression): void {
    verifyTxn(this.txn, { sender: this.app.creator });
    this.regressionPerformanceMetrics('regModel').value = evaluationMetrics;
  }

  // model selection criteria for reg models
  regModelSelectionCriteria(modelEvaluationMetrics: Regression): string {
    const baselineRegMetrics = this.regressionPerformanceMetrics('regModel').value;
    if (
      modelEvaluationMetrics.MSE <= baselineRegMetrics.MSE &&
      modelEvaluationMetrics.MAE <= baselineRegMetrics.MAE &&
      modelEvaluationMetrics.RMSE <= baselineRegMetrics.RMSE &&
      modelEvaluationMetrics.COD >= baselineRegMetrics.COD
    ) {
      return 'Model has been accepted for further consideration';
    }
    return 'failed the minimum requirements';
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

  // distribute rewards
  distributeRewards(contributor: rewardCalculation): uint64[] {
    const baseCase = this.classificationPerformanceMetrics('InitialModelMetrics').value;
    const honestyScores: StaticArray<uint64, 3> = [50, 50, 50];
    const pricePool = 10_000_000;
    let poolWeight = 0;

    const total = baseCase.accuracy + baseCase.precision + baseCase.recall + baseCase.f1score;
    let excess = 0;
    const rewardAmount: uint64[] = [];

    if (contributor.score > total) {
      excess = contributor.score - total;
    }

    honestyScores.forEach((honestyScore: uint64) => {
      const repWeight = wideRatio([honestyScore * honestyScore * 1000], [100 * 100]);

      const participantWeight = repWeight * excess;

      poolWeight += participantWeight;
    });

    honestyScores.forEach((honestyScore: uint64) => {
      const repWeight = wideRatio([honestyScore * honestyScore * 1000], [100 * 100]);

      const participantWeight = repWeight * excess;

      const reward = wideRatio([participantWeight * pricePool], [poolWeight]);

      rewardAmount.push(reward);
    });

    return rewardAmount;
  }

  //  delete contract
  deleteApplication(): void {
    assert(this.txn.sender === this.app.creator);
    sendPayment({
      closeRemainderTo: this.txn.sender,
    });
  }
}
