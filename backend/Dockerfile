# Node.js LTS 버전 사용
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 데이터베이스 디렉토리 생성
RUN mkdir -p /data

# 포트 노출
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_STORAGE=/data/database.sqlite

# 서버 시작
CMD ["node", "server.js"]
