FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY start.sh ./start.sh

RUN mkdir -p /app/storage/uploads
RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["./start.sh"]
