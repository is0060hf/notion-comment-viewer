import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getNotionClient, searchNotionPages } from '@/lib/notion';

export async function GET(request: NextRequest) {
  try {
    // セッションからアクセストークンを取得
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // クエリパラメータから検索キーワードを取得
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        { error: '検索キーワードが指定されていません' },
        { status: 400 }
      );
    }
    
    // Notion APIクライアントを初期化
    const notionClient = getNotionClient(session.accessToken as string);
    
    // ページを検索
    const results = await searchNotionPages(notionClient, query);
    
    // デバッグ情報を追加
    console.log(`検索クエリ「${query}」の結果:`, results);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Notion検索API エラー:', error);
    return NextResponse.json(
      { error: '検索中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
