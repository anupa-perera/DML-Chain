from flask import Flask, jsonify, request
from flask_cors import CORS

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

if __name__ == '__main__':
    app.run(debug=True)
