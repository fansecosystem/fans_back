FROM node:21-slim

RUN apt update && apt install -y openssl procps \
  && apt-get clean

RUN npm install -g @nestjs/cli@10.3.2

WORKDIR /home/app

USER node

EXPOSE 8081

CMD ["tail", "-f", "/dev/null"]