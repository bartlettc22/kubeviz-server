FROM node:alpine

EXPOSE 80

COPY src /usr/src/app

WORKDIR /usr/src/app

RUN npm install

# CMD sh
CMD ["node", "server.js"]
