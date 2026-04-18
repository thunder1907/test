def register_routes(app):
    from .health import health_bp
    from .complaints import complaints_bp
    from .stats import stats_bp

    app.register_blueprint(health_bp,      url_prefix="/api")
    app.register_blueprint(complaints_bp,  url_prefix="/api")
    app.register_blueprint(stats_bp,       url_prefix="/api")