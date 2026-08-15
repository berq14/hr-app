-- CreateTable
CREATE TABLE "IvrSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "saat1" TEXT NOT NULL DEFAULT '10:30',
    "saat2" TEXT NOT NULL DEFAULT '15:30',
    "maxDeneme" INTEGER NOT NULL DEFAULT 3,
    "olumluEsigi" INTEGER NOT NULL DEFAULT 100,
    "sonCalistirma" DATETIME,
    "sonSlot" TEXT
);

-- CreateTable
CREATE TABLE "IvrQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sira" INTEGER NOT NULL,
    "metin" TEXT NOT NULL,
    "olumluTus" TEXT NOT NULL DEFAULT '1',
    "eleyici" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IvrCallTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "denemeSayisi" INTEGER NOT NULL DEFAULT 0,
    "sonDeneme" DATETIME,
    "cevaplar" TEXT,
    "sonuc" TEXT,
    "kaynak" TEXT NOT NULL DEFAULT 'otomatik',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IvrCallTask_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IvrCallTask_durum_idx" ON "IvrCallTask"("durum");

-- CreateIndex
CREATE INDEX "IvrCallTask_candidateId_idx" ON "IvrCallTask"("candidateId");
