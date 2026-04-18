from flask import Flask
from flask_cors import CORS
from .extensions import init_db, db_session
from .routes import register_routes


def create_app():
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:3000"])

    # Boot database — creates tables if they don't exist
    with app.app_context():
        init_db()

    # Tear down session after each request
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    register_routes(app)
    return app