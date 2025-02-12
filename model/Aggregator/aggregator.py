import sys
sys.path.append('..')
from ipfs_configs import retrieve_model_params
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split

def get_model_params(params_array):
  federation_packages = []
  for model_id, item in params_array.items():
    ipfs_hash = item.get('paramHash')
    param_key = item.get('paramKey')
    result = retrieve_model_params(ipfs_hash, param_key)
    print(result)
    federation_packages.append(result)
  return federation_packages

def get_global_model(federation_packages):
  # Stack and average predictions
  all_predictions = np.stack([pkg['predictions'] for pkg in federation_packages])
  global_predictions = np.mean(all_predictions, axis=0)

  # Stack and average feature importances
  all_importances = np.stack([pkg['feature_importances'] for pkg in federation_packages])
  global_importances = np.mean(all_importances, axis=0)

  # Get averaged hyperparameters
  n_estimators = int(np.mean([pkg['n_estimators'] for pkg in federation_packages]))
  max_features = federation_packages[0]['max_features']
  avg_max_depth = np.mean([pkg['max_depth'] for pkg in federation_packages])
  max_depth = int(avg_max_depth) if avg_max_depth > 0 else None  # Use None for unlimited depth

  # Initialize global model
  global_model = RandomForestClassifier(
    n_estimators=n_estimators,
    max_features=max_features,
    max_depth=max_depth
  )

  # Return the model along with global predictions and global importances
  return global_model, global_predictions, global_importances

def evaluate_global_model(federation_packages, data_path="creditcard.csv"):
    print('im in here')
    # Load dataset
    data = pd.read_csv(data_path)

    # Separating the X and the Y values
    X = data.drop(['Class'], axis=1)
    Y = data["Class"]

    print(X.shape)
    print(Y.shape)

    # Split the data into training and testing sets
    xTrain, xTest, yTrain, yTest = train_test_split(X, Y, test_size=0.2, random_state=42)

    # Create global model
    global_model, global_predictions, global_importances = get_global_model(federation_packages)

    # Train the global model with the training data
    global_model.fit(xTrain, yTrain)

    # Make predictions with global model
    global_test_predictions = global_model.predict(xTest)

    # Calculate performance metrics
    metrics = {
      'accuracy': float(accuracy_score(yTest, global_test_predictions)),
      'precision': float(precision_score(yTest, global_test_predictions, zero_division=1)),
      'recall': float(recall_score(yTest, global_test_predictions, zero_division=1)),
      'f1_score': float(f1_score(yTest, global_test_predictions, zero_division=1))
    }

    return metrics




