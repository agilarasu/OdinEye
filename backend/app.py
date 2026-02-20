"""Flask master backend for CISO device management."""

from flask import Flask
from flask_cors import CORS

from api.devices import bp as devices_bp
from api.agents import bp as agents_bp
from api.threats import bp as threats_bp

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

app.register_blueprint(devices_bp, url_prefix="/api/devices")
app.register_blueprint(agents_bp, url_prefix="/api/agents")
app.register_blueprint(threats_bp, url_prefix="/api/threats")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
