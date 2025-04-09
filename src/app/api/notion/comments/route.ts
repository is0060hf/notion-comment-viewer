import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getNotionClient, getSubpages, getPageComments, filterNoReplyComments, filterParticipatingThreads, filterMyComments, diagnoseNotionPage } from '@/lib/notion';
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
    
    // アクセス権限の問題を検出するためのフラグ
    let hasPermissionIssues = false;
    let notFoundPages: string[] = [];
    
    // まず対象ページの診断を行い、データベースかどうか確認
    console.log(`ページ診断を開始: ${rootPageId}`);
    let isDatabaseRoot = false;
    let dbName = '';
    
    try {
      const diagnosis = await diagnoseNotionPage(notionClient, rootPageId);
      
      if (diagnosis.access && diagnosis.type === 'database') {
        isDatabaseRoot = true;
        dbName = diagnosis.title || 'データベース';
        console.log(`ルートはデータベース: ${dbName}`);
      } else if (diagnosis.access) {
        console.log(`ルートはページ: ${diagnosis.type}`);
      } else {
        hasPermissionIssues = true;
        notFoundPages.push(rootPageId);
        console.log(`ルートページへのアクセス権限がありません: ${rootPageId}`);
      }
    } catch (diagnosisError) {
      console.error('診断エラー:', diagnosisError);
    }
    
    let allComments: Comment[] = [];
    
    // データベースルートの場合
    if (isDatabaseRoot) {
      try {
        console.log(`データベース ${rootPageId} のコメントを直接取得中...`);
        const dbComments = await getPageComments(notionClient, rootPageId);
        allComments = [...allComments, ...dbComments];
        console.log(`データベース本体から ${dbComments.length} 件のコメントを取得`);
      } catch (dbCommentError) {
        console.error(`データベースコメント取得エラー: ${rootPageId}`, dbCommentError);
        hasPermissionIssues = true;
      }
    }
    // 通常のページルートの場合
    else {
      // ページIDのリストを取得（サブページを含む場合は再帰的に取得）
      let pageIds = [rootPageId];
      if (includeSubPages) {
        try {
          pageIds = await getSubpages(notionClient, rootPageId);
          console.log(`取得したページID数: ${pageIds.length}`);
        } catch (subpagesError) {
          console.error('サブページ取得エラー:', subpagesError);
          // エラーがあっても元のページIDだけで続行
          if (subpagesError instanceof Error && 
              subpagesError.message.includes('Make sure the relevant pages and databases are shared with your integration')) {
            hasPermissionIssues = true;
            notFoundPages.push(rootPageId);
          }
        }
      }
      
      // 各ページのコメントを取得
      for (const pageId of pageIds) {
        try {
          const pageComments = await getPageComments(notionClient, pageId);
          allComments = [...allComments, ...pageComments];
          console.log(`ページ ${pageId} から ${pageComments.length} 件のコメントを取得`);
        } catch (commentError) {
          console.error(`ページ ${pageId} のコメント取得エラー:`, commentError);
          // エラーがあっても他のページの処理を続行
          if (commentError instanceof Error && 
              commentError.message.includes('Make sure the relevant pages and databases are shared with your integration')) {
            hasPermissionIssues = true;
            if (!notFoundPages.includes(pageId)) {
              notFoundPages.push(pageId);
            }
          }
        }
      }
    }
    
    console.log(`合計 ${allComments.length} 件のコメントを取得`);
    
    // フィルタリング
    let filteredComments = allComments;
    
    // 未解決のコメントのみ
    if (filterUnresolved) {
      filteredComments = filteredComments.filter(comment => !comment.isResolved);
      console.log(`未解決フィルター適用後: ${filteredComments.length} 件`);
    }
    
    // 一定期間返信なしのコメント
    if (filterNoReplyDays > 0) {
      filteredComments = filterNoReplyComments(filteredComments, filterNoReplyDays);
      console.log(`返信なし(${filterNoReplyDays}日)フィルター適用後: ${filteredComments.length} 件`);
    }
    
    // 自分宛てのコメント or 自分が参加しているスレッド
    if (shouldFilterMyComments && session.user?.name) {
      const userId = session.user.name;
      const mentionedComments = filterMyComments(filteredComments, userId);
      const participatingComments = filterParticipatingThreads(filteredComments, userId);
      
      // 重複を除去して結合
      const combinedComments = [...mentionedComments, ...participatingComments];
      filteredComments = Array.from(new Set(combinedComments));
      console.log(`自分宛てフィルター適用後: ${filteredComments.length} 件`);
    }
    
    // 結果を返す（アクセス権限の問題がある場合は警告も含める）
    return NextResponse.json({
      comments: filteredComments,
      hasPermissionIssues: hasPermissionIssues,
      notFoundPages: notFoundPages,
      isDatabase: isDatabaseRoot,
      databaseName: dbName,
      warning: hasPermissionIssues 
        ? 'いくつかのページへのアクセス権限がありません。Notionインテグレーションとページが正しく共有されているか確認してください。' 
        : undefined
    });
  } catch (error) {
    console.error('コメント取得API エラー:', error);
    
    // エラーの種類に応じたメッセージ
    let errorMessage = 'コメント取得中にエラーが発生しました';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Make sure the relevant pages and databases are shared with your integration')) {
        errorMessage = 'Notionページへのアクセス権限がありません。Notionインテグレーションとページが共有されているか確認してください。';
        statusCode = 403;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
