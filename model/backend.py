from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from ipfs_configs import retrieve_model, retrieve_model_params
from Aggregator.aggregator import get_model_params, evaluate_global_model
from database import create_user, address_exists, get_user_by_address, add_listing_to_created, get_filtered_listings, add_listing_to_subscribed, get_subscribed_listings

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
  print(f"Retrieving model with IPFS hash: {ipfs_hash}, Contract ID: {contract_id}")
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
  if not address:
    return jsonify({"error": "Address parameter is required"}), 400

  exists = address_exists(address)
  return jsonify({"exists": exists}), 200


# create a new user
@app.route('/create-user/<address>', methods=['POST'])
def insert_record(address):
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

# add a listing to the created listings of a user.
@app.route('/add-listing', methods=['POST'])
def add_listing():
    data = request.json
    address = data.get('address')
    contract_id = data.get('contractId')
    created_at = data.get('createdAt')
    expires_at = data.get('expiresAt')
    url = data.get('url')

    if not address or not contract_id or not created_at or not expires_at or not url:
        return jsonify({"error": "All parameters (address, contractId, createdAt, expiresAt, URL) are required"}), 400

    if not address_exists(address):
        return jsonify({"error": "User does not exist"}), 404

    success = add_listing_to_created(address, contract_id, created_at, expires_at, url)
    if success:
        return jsonify({"message": "Listing added successfully"}), 200
    else:
        return jsonify({"error": "Failed to add listing"}), 500


# Endpoint to get filtered listings based on the user's address.
@app.route('/get-filtered-listings/<address>', methods=['GET'])
def get_filtered_listings_endpoint(address):
    if not address:
        return jsonify({"error": "Address parameter is required"}), 400

    listings = get_filtered_listings(address)
    if listings is not None:
        return jsonify(listings), 200
    else:
        return jsonify({"error": "Failed to retrieve listings"}), 500

@app.route('/add-subscribed-listing', methods=['POST'])
def add_subscribed_listing():
    """Endpoint to add a listing to the subscribed listings of a user."""
    data = request.json
    address = data.get('address')
    contract_id = data.get('contractId')
    created_at = data.get('createdAt')
    expires_at = data.get('expiresAt')
    url = data.get('url')
    creator_address = data.get('creatorAddress')
    reputation = data.get('reputation')

    if not all([address, contract_id, created_at, expires_at, url, creator_address, reputation]):
        return jsonify({"error": "All parameters are required"}), 400

    if not address_exists(address):
        return jsonify({"error": "User does not exist"}), 404

    success = add_listing_to_subscribed(address, contract_id, created_at, expires_at, url, creator_address, reputation)
    if success:
        return jsonify({"message": "Subscribed listing added successfully"}), 200
    else:
        return jsonify({"error": "Failed to add subscribed listing"}), 500

@app.route('/get-subscribed-listings/<address>', methods=['GET'])
def get_subscribed_listings_endpoint(address):
    if not address:
        return jsonify({"error": "Address parameter is required"}), 400

    listings = get_subscribed_listings(address)
    if listings is not None:
        return jsonify(listings), 200
    else:
        return jsonify({"error": "Failed to retrieve subscribed listings"}), 500

if __name__ == '__main__':
    app.run(debug=True)


