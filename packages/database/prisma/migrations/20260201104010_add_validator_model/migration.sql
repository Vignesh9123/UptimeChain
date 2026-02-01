-- CreateTable
CREATE TABLE "Validator" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stake_amount" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Validator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Validator_user_id_key" ON "Validator"("user_id");

-- AddForeignKey
ALTER TABLE "Validator" ADD CONSTRAINT "Validator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
