FROM python:3.10-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY . .

RUN mkdir -p /.u2net && chmod 777 /.u2net
ENV NUMBA_CACHE_DIR=/tmp

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]