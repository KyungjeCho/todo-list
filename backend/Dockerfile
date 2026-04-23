# AWS Lambda Container Image for NestJS Backend
FROM public.ecr.aws/lambda/nodejs:20 AS builder

WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ ./src/

RUN npm run build

# ---

FROM public.ecr.aws/lambda/nodejs:20

COPY --from=builder /build/dist ${LAMBDA_TASK_ROOT}/dist
COPY --from=builder /build/package.json ${LAMBDA_TASK_ROOT}/
COPY --from=builder /build/package-lock.json ${LAMBDA_TASK_ROOT}/

RUN npm ci --omit=dev

CMD ["dist/src/lambda.handler"]
