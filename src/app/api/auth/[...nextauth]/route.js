import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        userId: { label: "User ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        await connectToDatabase();

        const user = await User.findOne({ citizen_id: credentials.userId });

        if (!user) {
          throw new Error("No user found");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Return the user object, mapped cleanly to NextAuth
        return {
          id: user._id.toString(),
          citizen_id: user.citizen_id,
           name: `${user.first_name} ${user.last_name}`,
          first_name: user.first_name,
           role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.citizen_id = user.citizen_id;
        token.role = user.role;
         token.first_name = user.first_name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.citizen_id = token.citizen_id;
         session.user.role = token.role;
        session.user.first_name = token.first_name;
      }
      return session;
    },
  },
  session: {
     strategy: "jwt",
  },
  pages: {
    signIn: "/login", 
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
