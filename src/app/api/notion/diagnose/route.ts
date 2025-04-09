import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getNotionClient, diagnoseNotionPage, extractPageIdFromUrl } from '@/lib/notion';

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
    let pageId = searchParams.get('pageId') || '';
    
    if (!pageId) {
      return NextResponse.json(
        { error: 'ページIDが指定されていません' },
        { status: 400 }
      );
    }
    
    // URLの場合はIDを抽出
    if (pageId.includes('notion.so/') || pageId.includes('notion.site/')) {
      const extractedId = extractPageIdFromUrl(pageId);
      if (extractedId) {
        console.log(`URL '${pageId}' からIDを抽出: ${extractedId}`);
        pageId = extractedId;
      } else {
        return NextResponse.json(
          { error: '指定されたNotionのURLからIDを抽出できませんでした' },
          { status: 400 }
        );
      }
    }
    
    // ハイフンなしIDを標準形式に変換
    if (pageId.length === 32 && !pageId.includes('-')) {
      pageId = `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`;
      console.log(`ハイフンなしIDを標準形式に変換: ${pageId}`);
    }
    
    // Notion APIクライアントを初期化
    const notionClient = getNotionClient(session.accessToken as string);
    
    // ページの診断を実行
    console.log(`診断開始: ${pageId}`);
    const diagnosis = await diagnoseNotionPage(notionClient, pageId);
    console.log(`診断完了: ${JSON.stringify(diagnosis, null, 2)}`);
    
    // レスポンスの構築
    const response = {
      pageId,
      normalizedId: diagnosis.cleanId || pageId,
      diagnosis,
      recommendations: getRecommendations(diagnosis),
      notionUrl: `https://www.notion.so/${(diagnosis.cleanId || pageId).replace(/-/g, '')}`
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Notion診断API エラー:', error);
    
    let errorMessage = '診断中にエラーが発生しました';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// 診断結果に基づいて推奨アクションを返す
function getRecommendations(diagnosis: {
  access: boolean;
  type: string;
  parentType?: string;
  parentId?: string;
  title?: string;
  error?: string;
  databaseInfo?: {
    id: string;
    name?: string;
    access: boolean;
  };
}): string[] {
  const recommendations: string[] = [];
  
  if (!diagnosis.access) {
    recommendations.push('ページまたはデータベースへのアクセス権がありません。Notionインテグレーションと共有してください。');
    
    if (diagnosis.error && diagnosis.error.includes('Make sure the relevant pages and databases are shared with your integration')) {
      recommendations.push('Notionページを開き、右上の「共有」ボタンからインテグレーションにアクセス権を付与してください。');
    }
  } else {
    // アクセスはあるが、他に問題がある場合
    if (diagnosis.error && diagnosis.error.includes('コメントアクセスエラー')) {
      recommendations.push('ページへのアクセスはありますが、コメントへのアクセス権がありません。ページをインテグレーションと再共有してみてください。');
    }
    
    // データベース関連のレコメンデーション
    if (diagnosis.type === 'page' && diagnosis.parentType === 'database_id') {
      recommendations.push('このページはデータベースのレコードです。データベース自体（親）にもアクセス権を付与してください。');
      
      if (diagnosis.parentId) {
        recommendations.push(`親データベースID: ${diagnosis.parentId} - このデータベースにもアクセス権を付与してください。`);
      }
      
      // データベース情報がある場合
      if (diagnosis.databaseInfo) {
        if (diagnosis.databaseInfo.access) {
          recommendations.push(`親データベース「${diagnosis.databaseInfo.name || '不明'}」へのアクセス権はありますが、データベース内の全レコードにもアクセス権を付与してください。`);
        } else {
          recommendations.push(`親データベース（ID: ${diagnosis.databaseInfo.id}）へのアクセス権がありません。データベースをインテグレーションと共有してください。`);
        }
      }
    }
    
    // データベース自体の場合
    if (diagnosis.type === 'database') {
      recommendations.push('このIDはデータベースを指しています。データベース内の各レコード（ページ）にもアクセス権を付与する必要があります。');
      recommendations.push('データベースの「共有」メニューから、インテグレーションに「ページのコンテンツへのアクセス」権限を付与してください。');
    }
  }
  
  // 共通の推奨事項
  recommendations.push('Notionの権限変更は反映まで数分かかる場合があります。しばらく待ってから再試行してください。');
  
  return recommendations;
} 