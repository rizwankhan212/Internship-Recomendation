"""
ML Backend — Windows Startup Helper
Activates venv if present, then launches uvicorn.
"""
import os, sys, subprocess

VENV = os.path.join(os.path.dirname(__file__), "venv")

def main():
    python = sys.executable

    # Use venv if it exists
    venv_python = os.path.join(VENV, "Scripts", "python.exe")
    if os.path.exists(venv_python):
        python = venv_python
        print(f"✅ Using virtual env at {VENV}")
    else:
        print(f"ℹ️  No venv found at {VENV} — using system Python: {python}")

    print("🚀 Starting ML Backend on port 8001...")
    subprocess.run([
        python, "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", "8001",
        "--reload",
        "--log-level", "info",
    ])

if __name__ == "__main__":
    main()
