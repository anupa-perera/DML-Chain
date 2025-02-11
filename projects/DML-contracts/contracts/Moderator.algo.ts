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

type ParamsData = {
  paramHash: string;
  paramKey: string;
};

export class DMLChain extends Contract {
  // store hash on global state
  ipfsHash = GlobalStateKey<string>({ key: 'ipfsHash' });

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

  // printHash
  printHash(): string {
    return this.ipfsHash.value;
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
  classModelSelectionCriteria(modelEvaluationMetrics: Classification): boolean {
    assert(this.classificationPerformanceMetrics('InitialModelMetrics').exists);
    const baselineClassMetrics = this.classificationPerformanceMetrics('InitialModelMetrics').value;
    if (
      modelEvaluationMetrics.accuracy >= baselineClassMetrics.accuracy &&
      modelEvaluationMetrics.precision >= baselineClassMetrics.precision &&
      modelEvaluationMetrics.recall >= baselineClassMetrics.recall &&
      modelEvaluationMetrics.f1score >= baselineClassMetrics.f1score
    ) {
      return true;
    }
    return false;
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
  distributeRewards(): uint64 {
    const baseCase = this.classificationPerformanceMetrics('InitialModelMetrics').value;
    let total = 0;
    total += baseCase.accuracy;
    total += baseCase.precision;
    total += baseCase.recall;
    total += baseCase.f1score;
    return total;
  }

  //  delete contract
  deleteApplication(): void {
    assert(this.txn.sender === this.app.creator);
    sendPayment({
      closeRemainderTo: this.txn.sender,
    });
  }
}
