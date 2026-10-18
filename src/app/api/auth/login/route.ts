import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, guestSessionId } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check account lockout (FR-AUTH-07)
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const waitMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      return NextResponse.json(
        {
          error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${waitMinutes} minutes.`,
        },
        { status: 423 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      const newAttempts = user.failedLoginAttempts + 1;
      let lockUpdate: any = { failedLoginAttempts: newAttempts };

      // 5 failed attempts = 15 min lock
      if (newAttempts >= 5) {
        lockUpdate.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: lockUpdate,
      });

      return NextResponse.json(
        {
          error: newAttempts >= 5
            ? "Account locked for 15 minutes due to 5 consecutive failed login attempts."
            : "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // Merge guest cart if guestSessionId exists (FR-AUTH-09)
    if (guestSessionId) {
      const guestCart = await prisma.cart.findUnique({
        where: { sessionId: guestSessionId },
        include: { items: true },
      });

      if (guestCart && guestCart.items.length > 0) {
        let userCart = await prisma.cart.findFirst({
          where: { userId: user.id },
        });

        if (!userCart) {
          userCart = await prisma.cart.create({
            data: { userId: user.id },
          });
        }

        for (const item of guestCart.items) {
          const existingItem = await prisma.cartItem.findUnique({
            where: {
              cartId_variantId: {
                cartId: userCart.id,
                variantId: item.variantId,
              },
            },
          });

          if (existingItem) {
            await prisma.cartItem.update({
              where: { id: existingItem.id },
              data: { quantity: Math.min(10, existingItem.quantity + item.quantity) },
            });
          } else {
            await prisma.cartItem.create({
              data: {
                cartId: userCart.id,
                variantId: item.variantId,
                quantity: Math.min(10, item.quantity),
              },
            });
          }
        }

        // Clean up guest cart items
        await prisma.cartItem.deleteMany({
          where: { cartId: guestCart.id },
        });
      }
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    res.cookies.set("ripzy_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Something went wrong during login." }, { status: 500 });
  }
}
