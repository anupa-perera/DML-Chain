import { Contract } from '@algorandfoundation/tealscript';

// const COST_PER_BYTE = 400;
// const COST_PER_BOX = 2500;
// const MAX_BOX_SIZE = 32768;

type Classification = {
  accuracy: uint64;
  precision: uint64;
  recall: uint64;
  specificity: uint64;
  F1Score: uint64;
  ROC: uint64;
};

type Regression = {
  MSE: uint64;
  RMSE: uint64;
  MAE: uint64;
  COD: uint64;
};

export class DMLChain extends Contract {
  // store hash on global state
  ipfsHash = GlobalStateKey<string>();

  // Store params in BoxMap
  parameterKeys = BoxMap<string, string>({ prefix: 'parameterKeys' });

  // store selection criteria in BoxMap
  regressionPerformanceMetrics = BoxMap<string, Regression>({ prefix: 'regressionPerformanceMetrics' });

  classificationPerformanceMetrics = BoxMap<string, Classification>({ prefix: 'classificationPerformanceMetrics' });

  // assign hash to global state
  createApplication(modelHash: string): void {
    this.ipfsHash.value = modelHash;
  }

  // printHash
  printHash(): string {
    return this.ipfsHash.value;
  }

  // store model params
  storeModelParams(paramkeys: string[], paramValues: string[]): void {
    assert(this.txn.sender === this.app.creator);
    assert(paramkeys.length === paramValues.length);

    let i = 0;
    while (i < paramkeys.length) {
      const key = paramkeys[i];
      const value = paramValues[i];

      this.parameterKeys(key).value = value;

      i = i + 1;
    }
  }

  // // print all stored model params
  // printModelParams(paramkeys: string[]): string[] {
  //   const values: string[] = [];
  //   let i = 0;
  //   while (i < paramkeys.length) {
  //     const key = paramkeys[i];
  //     values[i] = this.parameterKeys(key).value;
  //     i = i + 1;
  //   }
  //   return values;
  // }

  // store classification model selection criteria
  private storeClassificationSelectionCriteria(evaluationMetrics: Classification): void {
    this.classificationPerformanceMetrics('rclassModel').value = evaluationMetrics;
  }

  // store Regression model selection criteria
  private storeModelRegressionSelectionCriteria(evaluationMetrics: Regression): void {
    this.regressionPerformanceMetrics('regModel').value = evaluationMetrics;
  }

  // model selection criteria for reg models
  private regModelSelectionCriteria(modelEvaluationMetrics: Regression): string {
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

  // model selection criteria for classification models
  private classModelSelectionCriteria(modelEvaluationMetrics: Classification): string {
    const baselineClassMetrics = this.classificationPerformanceMetrics('rclassModel').value;
    if (
      modelEvaluationMetrics.accuracy >= baselineClassMetrics.accuracy &&
      modelEvaluationMetrics.precision >= baselineClassMetrics.precision &&
      modelEvaluationMetrics.recall >= baselineClassMetrics.recall &&
      modelEvaluationMetrics.specificity >= baselineClassMetrics.specificity &&
      modelEvaluationMetrics.F1Score >= baselineClassMetrics.F1Score &&
      modelEvaluationMetrics.ROC >= baselineClassMetrics.ROC
    ) {
      return 'Model has been accepted for further consideration';
    }
    return 'failed the minimum requirements';
  }

  //  delete contract
  deleteApplication(): void {
    assert(this.txn.sender === this.app.creator);
  }
}
