/*
  Warnings:

  - You are about to drop the `GuestShippingAddress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GuestShippingAddress" DROP CONSTRAINT "GuestShippingAddress_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "guestShippingCity" TEXT,
ADD COLUMN     "guestShippingCountry" TEXT,
ADD COLUMN     "guestShippingState" TEXT,
ADD COLUMN     "guestShippingStreet" TEXT,
ADD COLUMN     "guestShippingZipCode" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- DropTable
DROP TABLE "GuestShippingAddress";

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
