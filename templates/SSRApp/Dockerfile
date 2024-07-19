FROM node:20.15.1-alpine


RUN mkdir /home/app

RUN apk --no-cache update \
        && apk add --no-cache \
        python \
        make \
        g++ \
        automake \
        autoconf \
        zlib-dev \
        mongodb-tools \
        bash \
        rsync \
        git




CMD bash

