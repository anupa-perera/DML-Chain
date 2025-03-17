from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from ipfs_configs import retrieve_model, retrieve_model_params
from Aggregator.aggregator import get_model_params, evaluate_global_model
from database import create_user, address_exists, get_user_by_address, add_listing_to_created, get_filtered_listings, add_listing_to_subscribed, get_subscribed_listings, update_user_reputation, get_created_listings, update_feedback, mark_contract_as_paid, add_reported_listing, get_created_listings, get_reported_listings, update_reported_listing_status

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

# Update user reputation with merit/demerit upon user feedback
@app.route('/update-reputation', methods=['POST'])
def update_reputation():
  data = request.json
  if not data:
    print("Request body is missing")
    return jsonify({"error": "Request body is required"}), 400

  address = data.get('address')
  action = data.get('action')

  if not address:
    print("Address is missing")
    return jsonify({"error": "Address is required"}), 400
  if action not in ['merit', 'demerit']:
    print(f"Invalid action: {action}")
    return jsonify({"error": "Action must be either 'merit' or 'demerit'"}), 400

  user = get_user_by_address(address)
  if not user:
    print(f"User not found for address: {address}")
    return jsonify({"error": "User not found"}), 404

  if 'reputation' not in user:
    print(f"User has no reputation score for address: {address}")
    return jsonify({"error": "User has no reputation score"}), 400

  current_reputation = user['reputation']
  print(f"Current reputation for address {address}: {current_reputation}")

  if action == 'merit':
    new_reputation = min(100, current_reputation + 1)
  else:
    new_reputation = max(0, current_reputation - 2)

  print(f"New reputation for address {address}: {new_reputation}")

  if new_reputation != current_reputation:
    success = update_user_reputation(address, new_reputation)
  else:
    success = True

  if success:
    print(f"Reputation handled successfully for address {address}")
    return jsonify({
      "message": "Reputation handled successfully",
      "previousReputation": current_reputation,
      "newReputation": new_reputation,
      "changed": new_reputation != current_reputation
    }), 200
  else:
    print(f"Failed to update reputation for address {address}")
    return jsonify({"error": "Failed to update reputation"}), 500

@app.route('/get-created-listings/<address>', methods=['GET'])
def get_created_listings_endpoint(address):
    if not address:
        return jsonify({"error": "Address parameter is required"}), 400

    listings = get_created_listings(address)
    print(f"Created listings for address {address}: {listings}")
    if listings is not None:
        return jsonify(listings), 200
    else:
        return jsonify({"error": "Failed to retrieve created listings"}), 500

# Update user reputation with merit/demerit upon reward distribution
@app.route('/update-multiple-reputations', methods=['POST'])
def update_multiple_reputations():
  data = request.json
  if not data:
    return jsonify({"error": "Request body is required"}), 400

  merit_addresses = data.get('meritAddresses', [])
  demerit_addresses = data.get('demeritAddresses', [])

  results = {
    "successful": [],
    "failed": []
  }

  # Process merit addresses
  for address in merit_addresses:
    user = get_user_by_address(address)
    if not user or 'reputation' not in user:
      results["failed"].append({
        "address": address,
        "reason": "User not found or no reputation score"
      })
      continue

    current_reputation = user['reputation']
    new_reputation = min(100, current_reputation + 1)

    if update_user_reputation(address, new_reputation):
      results["successful"].append({
        "address": address,
        "previousReputation": current_reputation,
        "newReputation": new_reputation,
        "action": "merit"
      })
    else:
      results["failed"].append({
        "address": address,
        "reason": "Database update failed"
      })

  # Process demerit addresses
  for address in demerit_addresses:
    user = get_user_by_address(address)
    if not user or 'reputation' not in user:
      results["failed"].append({
        "address": address,
        "reason": "User not found or no reputation score"
      })
      continue

    current_reputation = user['reputation']
    new_reputation = max(0, current_reputation - 2)

    if update_user_reputation(address, new_reputation):
      results["successful"].append({
        "address": address,
        "previousReputation": current_reputation,
        "newReputation": new_reputation,
        "action": "demerit"
      })
    else:
      results["failed"].append({
        "address": address,
        "reason": "Database update failed"
      })

  return jsonify({
    "message": f"Processed {len(results['successful'])} successful updates and {len(results['failed'])} failed updates",
    "results": results
  }), 200

@app.route('/mark-contract-paid', methods=['POST'])
def mark_contract_paid():
    data = request.json
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    address = data.get('address')
    contract_id = data.get('contractId')

    if not address or not contract_id:
        return jsonify({"error": "Both address and contractId are required"}), 400

    success = mark_contract_as_paid(address, contract_id)
    if success:
        return jsonify({"message": "Contract marked as paid successfully"}), 200
    else:
        return jsonify({"error": "Failed to mark contract as paid"}), 500

@app.route('/update-feedback', methods=['POST'])
def update_feedback_endpoint():
    data = request.json
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    subscriber_address = data.get('subscriberAddress')
    contract_id = data.get('contractId')
    feedback_value = data.get('feedback')

    if not all([subscriber_address, contract_id, isinstance(feedback_value, bool)]):
        return jsonify({"error": "subscriberAddress, contractId, and feedback (boolean) are required"}), 400

    success = update_feedback(subscriber_address, contract_id, feedback_value)
    if success:
        return jsonify({"message": "Feedback updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update feedback"}), 500

@app.route('/report-listing', methods=['POST'])
def report_listing():
    data = request.json
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    contract_id = data.get('contractId')
    if not contract_id:
        return jsonify({"error": "Contract ID is required"}), 400

    result = add_reported_listing(contract_id)
    if result:
        return jsonify({"message": "Listing reported successfully", "reportId": str(result)}), 200
    elif result is False:
        return jsonify({"error": "Listing already reported or not found"}), 400
    else:
        return jsonify({"error": "Failed to report listing"}), 500

@app.route('/get-reported-listings', methods=['GET'])
def get_reported_listings_endpoint():
    listings = get_reported_listings()
    if listings is not None:
        return jsonify(listings), 200
    else:
        return jsonify({"error": "Failed to retrieve reported listings"}), 500

@app.route('/update-reported-listing-status', methods=['POST'])
def update_reported_listing_status_endpoint():
    data = request.json
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    contract_id = data.get('contractId')
    status = data.get('status')

    if not contract_id or not status:
        return jsonify({"error": "Contract ID and status are required"}), 400

    success = update_reported_listing_status(contract_id, status)
    if success:
        return jsonify({"message": "Status updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update status"}), 500

if __name__ == '__main__':
  app.run(debug=True)
