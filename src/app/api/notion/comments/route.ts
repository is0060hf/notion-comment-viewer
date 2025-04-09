import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getNotionClient, getSubpages, getPageComments, filterNoReplyComments, filterParticipatingThreads, filterMyComments } from '@/lib/notion';
import { Comment } from '@/types';

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
    
    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const rootPageId = searchParams.get('rootPageId');
    const includeSubPages = searchParams.get('includeSubPages') !== 'false';
    const filterUnresolved = searchParams.get('filterUnresolved') === 'true';
    const filterNoReplyDays = parseInt(searchParams.get('filterNoReplyDays') || '0', 10);
    const shouldFilterMyComments = searchParams.get('filterMyComments') === 'true';
    
    if (!rootPageId) {
      return NextResponse.json(
        { error: 'ページIDが指定されていません' },
        { status: 400 }
      );
    }
    
    // Notion APIクライアントを初期化
    const notionClient = getNotionClient(session.accessToken as string);
    
    // ページIDのリストを取得（サブページを含む場合は再帰的に取得）
    let pageIds = [rootPageId];
    if (includeSubPages) {
      pageIds = await getSubpages(notionClient, rootPageId);
    }
    
    // 各ページのコメントを取得
    let allComments: Comment[] = [];
    for (const pageId of pageIds) {
      const pageComments = await getPageComments(notionClient, pageId);
      allComments = [...allComments, ...pageComments];
    }
    
    // フィルタリング
    let filteredComments = allComments;
    
    // 未解決のコメントのみ
    if (filterUnresolved) {
      filteredComments = filteredComments.filter(comment => !comment.isResolved);
    }
    
    // 一定期間返信なしのコメント
    if (filterNoReplyDays > 0) {
      filteredComments = filterNoReplyComments(filteredComments, filterNoReplyDays);
    }
    
    // 自分宛てのコメント or 自分が参加しているスレッド
    if (shouldFilterMyComments && session.user?.name) {
      const userId = session.user.name;
      const mentionedComments = filterMyComments(filteredComments, userId);
      const participatingComments = filterParticipatingThreads(filteredComments, userId);
      
      // 重複を除去して結合
      const combinedComments = [...mentionedComments, ...participatingComments];
      filteredComments = Array.from(new Set(combinedComments));
    }
    
    return NextResponse.json({ comments: filteredComments });
  } catch (error) {
    console.error('コメント取得API エラー:', error);
    return NextResponse.json(
      { error: 'コメント取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
