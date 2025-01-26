from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from ipfs_configs import retrieve_model

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

@app.route('/retrieve-model/<ipfs_hash>', methods=['GET'])
def get_ipfs_model(ipfs_hash):
    """Endpoint to retrieve and download model from IPFS."""
    try:
        filepath = retrieve_model(ipfs_hash)
        return send_file(
            filepath,
            as_attachment=True,
            download_name=f'{ipfs_hash}_model.ipynb',
            mimetype='application/x-ipynb+json'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)


