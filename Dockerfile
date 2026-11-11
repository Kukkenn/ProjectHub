# ProjectHub w kontenerze (tryb serwera dla wielu kont).
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PROJECTHUB_MODE=hosted PROJECTHUB_DATA=/data PROJECTHUB_PORT=8765
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY static static
RUN useradd -r -u 10001 projecthub && mkdir /data && chown projecthub /data
USER projecthub
VOLUME /data
EXPOSE 8765
HEALTHCHECK --interval=30s --timeout=4s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8765/api/health',timeout=3).status==200 else 1)"
WORKDIR /app/backend
CMD ["python", "run.py"]
