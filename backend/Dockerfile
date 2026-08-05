# Node.js LTS
FROM node:20-alpine

WORKDIR /app

# 의존성을 먼저 복사해 레이어 캐시를 살린다 (소스만 바뀌면 재설치하지 않음)
COPY package*.json ./

# lockfile 기준 재현 가능한 설치
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# DB 는 외부 PostgreSQL(Supabase)을 쓰므로 컨테이너에 영구 볼륨이 필요 없다.
# 예전에는 DB_STORAGE=/data/database.sqlite 로 SQLite 를 볼륨에 두었는데,
# 그러면 머신이 볼륨 한 개에 묶여 확장이 막히고 볼륨 요금이 상시 발생했다.

CMD ["node", "server.js"]
