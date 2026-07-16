FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=https://api.easysaving.asia/api/v1
ARG NEXT_PUBLIC_SITE_URL=https://easysaving.asia
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
