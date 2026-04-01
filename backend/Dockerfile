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
COPY --from=builder /build/node_modules ${LAMBDA_TASK_ROOT}/node_modules
COPY --from=builder /build/package.json ${LAMBDA_TASK_ROOT}/

CMD ["dist/lambda.handler"]
