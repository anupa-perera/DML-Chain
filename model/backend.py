from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from ipfs_configs import retrieve_model, retrieve_model_params
from Aggregator.aggregator import get_model_params, evaluate_global_model
from database import create_user, address_exists, get_user_by_address, add_listing_to_created
from bson import ObjectId

app = Flask(__name__)
CORS(app)

# Global variable to store data
shared_data = None

# fetch data from shared memory.
@app.route('/data', methods=['GET'])
def get_data():
    if shared_data is None:
        return jsonify({"message": "No data available"}), 404
    return jsonify(shared_data)

# update shared memory from the notebook.
@app.route('/update-data', methods=['POST'])
def update_data():
    global shared_data
    shared_data = request.json
    return jsonify({"message": "Data updated successfully"}), 200

# retrieve and download model from IPFS.
@app.route('/retrieve-model/<contract_id>/<ipfs_hash>', methods=['GET'])
def get_ipfs_model(ipfs_hash, contract_id):
  try:
    filepath = retrieve_model(ipfs_hash, contract_id)
    return filepath
  except Exception as e:
    return jsonify({"error": str(e)}), 500

# retrieve for aggregation
@app.route('/aggregate', methods=['POST'])
def aggregate_model():
  try:
    global shared_data
    params = request.json
    print('params', params)
    shared_data = params
    return jsonify({"message": "Model data stored for aggregation successfully"}), 200

  except ValueError as e:
    print(f"ValueError: {e}")
    return jsonify({"error": "Invalid parameters", "details": str(e)}), 400
  except Exception as e:
    print(f"Exception: {e}")
    return jsonify({"error": "Internal server error", "details": str(e)}), 500


# check for address existence
@app.route('/check-address/<address>', methods=['GET'])
def check_address(address):
  """Endpoint to check if an address exists in the database."""
  if not address:
    return jsonify({"error": "Address parameter is required"}), 400

  exists = address_exists(address)
  return jsonify({"exists": exists}), 200


# create a new user
@app.route('/create-user/<address>', methods=['POST'])
def insert_record(address):
  """Endpoint to insert a record into the database using path parameter."""
  if not address:
    return jsonify({"error": "Address parameter is required"}), 400

  if address_exists(address):
    return jsonify({"error": "User already exists"}), 400

  record_id = create_user(address)
  if record_id:
    return jsonify({"message": "Record inserted successfully", "id": str(record_id)}), 201
  else:
    return jsonify({"error": "Failed to insert record"}), 500

# get user Information
@app.route('/get-user/<address>', methods=['GET'])
def get_user(address):
    if not address:
        return jsonify({"error": "Address parameter is required"}), 400

    user_data = get_user_by_address(address)
    if user_data:
        user_data['_id'] = str(user_data['_id'])
        return jsonify(user_data), 200
    else:
        return jsonify({"error": "User not found"}), 404

@app.route('/add-listing', methods=['POST'])
def add_listing():
    """Endpoint to add a listing to the created listings of a user."""
    data = request.json
    address = data.get('address')
    contract_id = data.get('contractId')
    created_at = data.get('createdAt')
    expires_at = data.get('expiresAt')

    if not address or not contract_id or not created_at or not expires_at:
        return jsonify({"error": "All parameters (address, contractId, createdAt, expiresAt) are required"}), 400

    if not address_exists(address):
        return jsonify({"error": "User does not exist"}), 404

    success = add_listing_to_created(address, contract_id, created_at, expires_at)
    if success:
        return jsonify({"message": "Listing added successfully"}), 200
    else:
        return jsonify({"error": "Failed to add listing"}), 500

if __name__ == '__main__':
    app.run(debug=True)


