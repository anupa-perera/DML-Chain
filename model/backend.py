from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from ipfs_configs import retrieve_model, retrieve_model_params
from Aggregator.aggregator import get_model_params, evaluate_global_model

app = Flask(__name__)
CORS(app)

# Global variable to store data
shared_data = None

@app.route('/data', methods=['GET'])
def get_data():
    """Endpoint to fetch data from shared memory."""
    if shared_data is None:
        return jsonify({"message": "No data available"}), 404
    return jsonify(shared_data)

@app.route('/update-data', methods=['POST'])
def update_data():
    """Endpoint to update shared memory from the notebook."""
    global shared_data
    shared_data = request.json
    return jsonify({"message": "Data updated successfully"}), 200

@app.route('/retrieve-model/<contract_id>/<ipfs_hash>', methods=['GET'])
def get_ipfs_model(ipfs_hash, contract_id):
  """Endpoint to retrieve and download model from IPFS."""
  try:
    filepath = retrieve_model(ipfs_hash, contract_id)
    return filepath
  except Exception as e:
    return jsonify({"error": str(e)}), 500

@app.route('/aggregate', methods=['POST'])
def aggregate_model():
  try:
    global shared_data
    params = request.json
    print('params', params)
    shared_data = params
    return jsonify({"message": "Model aggregated and stored successfully"}), 200

  except ValueError as e:
    print(f"ValueError: {e}")
    return jsonify({"error": "Invalid parameters", "details": str(e)}), 400
  except Exception as e:
    print(f"Exception: {e}")
    return jsonify({"error": "Internal server error", "details": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)


