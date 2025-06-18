import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

const userSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

export class AuthService {
  static async registerUser(data: { firstName: string; lastName: string; email: string; password: string }) {
    try {
      // Validate user input
      const validatedData = userSchema.parse(data);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email: validatedData.email } });
      if (existingUser) {
        throw new Error("User already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user with default role "customer"
      return prisma.user.create({
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          password: hashedPassword,
          role: "customer", // ✅ Ensure this appears only once
        },
      });
      
    } catch (error) {
      console.error("Error in registerUser:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to register user");
    }
  }

  static async loginUser(email: string, password: string) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
        throw new Error("Invalid credentials");
      }

      // Generate JWT token
      return jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "default_secret", { expiresIn: "1h" });
    } catch (error) {
      console.error("Error in loginUser:", error);
      throw new Error(error instanceof Error ? error.message : "Authentication failed");
    }
  }
}
