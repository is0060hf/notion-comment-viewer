import type { NextAuthOptions } from 'next-auth';

// Notion OAuthプロバイダーの設定
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'notion',
      name: 'Notion',
      type: 'oauth',
      authorization: {
        url: 'https://api.notion.com/v1/oauth/authorize',
        params: { 
          owner: 'user',
          response_type: 'code',
        },
      },
      token: 'https://api.notion.com/v1/oauth/token',
      userinfo: {
        url: 'https://api.notion.com/v1/users/me',
        async request({ tokens }) {
          const response = await fetch('https://api.notion.com/v1/users/me', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              'Notion-Version': '2022-06-28',
            },
          });
          return await response.json();
        },
      },
      clientId: process.env.NOTION_CLIENT_ID,
      clientSecret: process.env.NOTION_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      // アクセストークンをJWTに保存
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // セッションにアクセストークンを追加
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
