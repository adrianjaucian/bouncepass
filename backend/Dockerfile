FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py stats_engine.py ./

ENV PORT=8000
EXPOSE 8000

CMD gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:${PORT}
