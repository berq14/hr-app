-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'IK_UZMANI',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "twoFaOk" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ulke" TEXT NOT NULL DEFAULT 'Türkiye',
    "bolge" TEXT NOT NULL,
    "kurum" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "masrafMerkezi" TEXT,
    "ikSorumlusuId" TEXT,
    "yonetici1" TEXT,
    "yonetici2" TEXT,
    "yonetici3" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_ikSorumlusuId_fkey" FOREIGN KEY ("ikSorumlusuId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProjectPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'MY',
    "normKadro" INTEGER NOT NULL DEFAULT 0,
    "aktifKadro" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectPosition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectPosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'dijital',
    "maliyet" REAL NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adSoyad" TEXT NOT NULL,
    "adSoyadIndex" TEXT NOT NULL,
    "dogumTarihi" TEXT,
    "cinsiyet" TEXT,
    "telefon" TEXT,
    "telefonIndex" TEXT,
    "email" TEXT,
    "il" TEXT,
    "ilce" TEXT,
    "adres" TEXT,
    "positionId" TEXT,
    "projectId" TEXT,
    "sourceId" TEXT,
    "basvuruTarihi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ogrenimDurumu" TEXT,
    "engellilikDurumu" BOOLEAN NOT NULL DEFAULT false,
    "emeklilikDurumu" BOOLEAN NOT NULL DEFAULT false,
    "askerlikDurumu" TEXT,
    "deneyim" TEXT,
    "notlar" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'BEKLEMEDE',
    "onMulakatSonucu" TEXT,
    "onMulakatTarihi" DATETIME,
    "iseBaslama" BOOLEAN NOT NULL DEFAULT false,
    "iseBaslamaTarihi" DATETIME,
    "projeYonlendirildi" BOOLEAN NOT NULL DEFAULT false,
    "kvkkOnay" BOOLEAN NOT NULL DEFAULT false,
    "kvkkOnayTarihi" DATETIME,
    "girisYontemi" TEXT NOT NULL DEFAULT 'manuel',
    "importBatchId" TEXT,
    "qrCodeId" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Candidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Candidate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Candidate_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Candidate_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Candidate_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "aramaTarihi" DATETIME NOT NULL,
    "kacinciArama" INTEGER NOT NULL DEFAULT 1,
    "gorusmeSuresiSn" INTEGER,
    "sonuc" TEXT NOT NULL,
    "smsDurumu" TEXT,
    "smsOkundu" BOOLEAN NOT NULL DEFAULT false,
    "linkTiklandi" BOOLEAN NOT NULL DEFAULT false,
    "basvuruYapti" BOOLEAN NOT NULL DEFAULT false,
    "notlar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallRecord_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QrCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kod" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sourceId" TEXT,
    "kurum" TEXT,
    "pozisyonlar" TEXT NOT NULL,
    "projectId" TEXT,
    "cerceve" TEXT NOT NULL DEFAULT 'cerceveli',
    "renk" TEXT NOT NULL DEFAULT '#4F39F6',
    "ekBilgi" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "taramaSayisi" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QrCode_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QrCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dosyaAdi" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "toplamKayit" INTEGER NOT NULL DEFAULT 0,
    "basarili" INTEGER NOT NULL DEFAULT 0,
    "hatali" INTEGER NOT NULL DEFAULT 0,
    "hatalar" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'isleniyor',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ad" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'ingest',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "eylem" TEXT NOT NULL,
    "varlik" TEXT,
    "varlikId" TEXT,
    "detay" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_kod_key" ON "Project"("kod");

-- CreateIndex
CREATE INDEX "Project_bolge_idx" ON "Project"("bolge");

-- CreateIndex
CREATE INDEX "Project_kurum_idx" ON "Project"("kurum");

-- CreateIndex
CREATE INDEX "Project_segment_idx" ON "Project"("segment");

-- CreateIndex
CREATE UNIQUE INDEX "Position_ad_key" ON "Position"("ad");

-- CreateIndex
CREATE INDEX "ProjectPosition_projectId_idx" ON "ProjectPosition"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPosition_projectId_positionId_tip_key" ON "ProjectPosition"("projectId", "positionId", "tip");

-- CreateIndex
CREATE UNIQUE INDEX "Source_ad_key" ON "Source"("ad");

-- CreateIndex
CREATE INDEX "Candidate_durum_idx" ON "Candidate"("durum");

-- CreateIndex
CREATE INDEX "Candidate_basvuruTarihi_idx" ON "Candidate"("basvuruTarihi");

-- CreateIndex
CREATE INDEX "Candidate_adSoyadIndex_idx" ON "Candidate"("adSoyadIndex");

-- CreateIndex
CREATE INDEX "Candidate_telefonIndex_idx" ON "Candidate"("telefonIndex");

-- CreateIndex
CREATE INDEX "Candidate_positionId_idx" ON "Candidate"("positionId");

-- CreateIndex
CREATE INDEX "Candidate_projectId_idx" ON "Candidate"("projectId");

-- CreateIndex
CREATE INDEX "Candidate_sourceId_idx" ON "Candidate"("sourceId");

-- CreateIndex
CREATE INDEX "CallRecord_candidateId_idx" ON "CallRecord"("candidateId");

-- CreateIndex
CREATE INDEX "CallRecord_aramaTarihi_idx" ON "CallRecord"("aramaTarihi");

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_kod_key" ON "QrCode"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_slug_key" ON "QrCode"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_eylem_idx" ON "AuditLog"("eylem");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
