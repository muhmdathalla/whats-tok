FROM node:20-alpine

# Install dependencies needed for graphics/network
RUN apk add --no-cache ffmpeg git python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

CMD ["npm", "start"]
