import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"Warning: Could not create tables directly ({e}).")

    port = int(os.getenv("PORT", 5000))
    print(f"Starting ExamEase Backend REST API on http://0.0.0.0:{port} ...")
    app.run(host="0.0.0.0", port=port, debug=True)
