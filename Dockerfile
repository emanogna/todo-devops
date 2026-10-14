FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV DATABASE=/data/tasks.db
RUN mkdir -p /data
EXPOSE 5000
CMD ["python", "-c", "from app import app; app.run(host='0.0.0.0', port=5000)"]