"""Flask master backend for CISO device management."""

from flask import Flask
from flask_cors import CORS

from api.devices import bp as devices_bp
from api.agents import bp as agents_bp
from api.threats import bp as threats_bp

app = Flask(__name__)
CORS(app, origins=["*"])  # Allow local network; restrict origins in production

app.register_blueprint(devices_bp, url_prefix="/api/devices")
app.register_blueprint(agents_bp, url_prefix="/api/agents")
app.register_blueprint(threats_bp, url_prefix="/api/threats")

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)  # 0.0.0.0 = listen on all interfaces for LAN access
