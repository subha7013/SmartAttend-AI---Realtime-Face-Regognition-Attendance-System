FROM python:3.10-slim

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Download the ONNX model files during the build phase so they are pre-baked in the container image
RUN python download_models.py

# Expose port 8000
EXPOSE 8000

# Run uvicorn server pointing to main.py's app instance
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
