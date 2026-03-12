-- CreateEnum
CREATE TYPE "Role" AS ENUM ('driver', 'admin');

-- CreateEnum
CREATE TYPE "OSStatus" AS ENUM ('aberta', 'andamento', 'aguardando', 'concluida');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'driver',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OSSequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OSSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OS" (
    "id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "garagem" TEXT NOT NULL,
    "motorista" TEXT,
    "frota" TEXT NOT NULL,
    "km" INTEGER NOT NULL DEFAULT 0,
    "tipoServico" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "OSStatus" NOT NULL DEFAULT 'aberta',
    "createdBy" TEXT,
    "openedByName" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Req" (
    "id" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "garagem" TEXT NOT NULL,
    "frota" TEXT NOT NULL,
    "solicitante" TEXT NOT NULL,
    "data" TIMESTAMP(3),
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "OSStatus" NOT NULL DEFAULT 'aberta',
    "createdBy" TEXT,
    "osId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Req_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abastecimento" (
    "id" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frota" TEXT NOT NULL,
    "kmVeiculo" INTEGER NOT NULL,
    "kmInicioBomba" DOUBLE PRECISION NOT NULL,
    "kmFimBomba" DOUBLE PRECISION NOT NULL,
    "litros" DOUBLE PRECISION NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Abastecimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OS_status_idx" ON "OS"("status");

-- CreateIndex
CREATE INDEX "OS_createdBy_idx" ON "OS"("createdBy");

-- CreateIndex
CREATE INDEX "OS_createdAt_idx" ON "OS"("createdAt");

-- CreateIndex
CREATE INDEX "Req_status_idx" ON "Req"("status");

-- CreateIndex
CREATE INDEX "Req_createdAt_idx" ON "Req"("createdAt");

-- CreateIndex
CREATE INDEX "Req_osId_idx" ON "Req"("osId");

-- CreateIndex
CREATE INDEX "Abastecimento_dataHora_idx" ON "Abastecimento"("dataHora");

-- CreateIndex
CREATE INDEX "Abastecimento_createdAt_idx" ON "Abastecimento"("createdAt");

-- AddForeignKey
ALTER TABLE "OS" ADD CONSTRAINT "OS_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Req" ADD CONSTRAINT "Req_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Req" ADD CONSTRAINT "Req_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abastecimento" ADD CONSTRAINT "Abastecimento_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
