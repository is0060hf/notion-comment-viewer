import { Client } from '@notionhq/client';
import { NotionPage, Comment } from '@/types';

export const getNotionClient = (accessToken: string) => {
  return new Client({
    auth: accessToken,
  });
};

// ページ検索機能
export const searchNotionPages = async (
  notionClient: Client,
  query: string
): Promise<NotionPage[]> => {
  try {
    console.log(`Notionへの検索リクエスト: "${query}"`);
    
    // ページとデータベースの両方を検索
    const response = await notionClient.search({
      query,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: 100,
    });

    console.log(`Notionからの生レスポンス:`, JSON.stringify(response, null, 2));
    console.log(`検索結果数: ${response.results.length}`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await Promise.all(response.results.map(async (page: Record<string, any>) => {
      // ページタイトルの取得試行
      let title = 'Untitled';
      
      try {
        // オブジェクトタイプの確認
        const objectType = page.object || '';
        console.log(`オブジェクトタイプ: ${objectType} ID: ${page.id}`);
        
        // データベースの場合
        if (objectType === 'database') {
          // データベースのタイトル取得
          if (Array.isArray(page.title) && page.title.length > 0) {
            title = page.title[0]?.plain_text || page.title[0]?.text?.content || 'Untitled';
          } else {
            // 代替タイトル取得方法を試みる
            try {
              const dbDetails = await notionClient.databases.retrieve({ database_id: page.id });
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const details = dbDetails as any;
              if (Array.isArray(details.title) && details.title.length > 0) {
                title = details.title[0]?.plain_text || details.title[0]?.text?.content || title;
              }
              console.log('データベース詳細取得:', JSON.stringify(details.title, null, 2));
            } catch (err) {
              console.log('データベース詳細取得エラー:', err);
            }
            
            // データベースのより詳細な構造をログ出力
            console.log('データベース構造:', JSON.stringify(page, null, 2));
          }
          console.log('データベースタイトル:', title);
        } 
        // ページの場合
        else if (objectType === 'page') {
          // 通常ページのタイトル取得ロジック
          if (page.properties?.title?.title?.[0]?.plain_text) {
            // 通常ページのタイトル
            title = page.properties.title.title[0].plain_text;
          } else if (page.properties?.Name?.title?.[0]?.plain_text) {
            // 'Name'プロパティを持つページ
            title = page.properties.Name.title[0].plain_text;
          } else if (page.properties && Object.values(page.properties).length > 0) {
            // いずれかのタイトルプロパティを探す
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const [_key, prop] of Object.entries<any>(page.properties)) {
              if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
                title = prop.title[0].plain_text;
                break;
              }
            }
          } else if (page.child_page?.title) {
            // 子ページタイトル
            title = page.child_page.title;
          }
        }
        
        // それでもタイトルが取得できない場合はページの詳細を取得
        if (title === 'Untitled' && page.id) {
          try {
            const pageDetails = await notionClient.pages.retrieve({ page_id: page.id });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const details = pageDetails as any;
            
            if (details.properties?.title?.title?.[0]?.plain_text) {
              title = details.properties.title.title[0].plain_text;
            } else if (details.properties?.Name?.title?.[0]?.plain_text) {
              title = details.properties.Name.title[0].plain_text;
            }
          } catch (err) {
            console.log('ページ詳細取得エラー:', err);
          }
        }
      } catch (err) {
        console.error('タイトル取得エラー:', err);
      }
      
      return {
        id: page.id,
        title: title,
        url: page.url,
      };
    }));

    console.log(`タイトル取得後の検索結果:`, results.map(r => ({ id: r.id, title: r.title })));
    
    // 完全一致フィルタを削除し、すべての検索結果を返す
    return results;
  } catch (error) {
    console.error('Notion API検索エラー:', error);
    throw error;
  }
};

// 再帰的にサブページを取得する関数
export const getSubpages = async (
  notionClient: Client,
  pageId: string,
  allPages: string[] = []
): Promise<string[]> => {
  if (allPages.includes(pageId)) {
    return allPages;
  }

  allPages.push(pageId);

  try {
    // まずページブロックの子ブロックを取得
    try {
      const blockChildren = await notionClient.blocks.children.list({
        block_id: pageId,
        page_size: 100,
      });

      // 子ブロックの中からページタイプのものを抽出
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childPages = blockChildren.results.filter((block: Record<string, any>) => 
        block.type === 'child_page' || block.type === 'page'
      );

      // 各子ページについて再帰的に処理
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const childPage of childPages) {
        await getSubpages(notionClient, childPage.id, allPages);
      }
    } catch (blockError) {
      console.log(`ブロック取得エラー (${pageId}):`, blockError);
      // ブロック取得エラーは無視して続行
    }

    // データベース検出と処理
    try {
      // ページの詳細情報を取得
      const pageInfo = await notionClient.pages.retrieve({
        page_id: pageId,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageInfoAny = pageInfo as any;
      
      // ケース1: ページがデータベースの場合
      if (pageInfoAny.object === 'database') {
        const databaseId = pageInfoAny.id;
        console.log(`データベースを検出: ${databaseId}`);
        
        // データベース内のすべてのページを取得
        try {
          const dbPages = await notionClient.databases.query({
            database_id: databaseId,
          });
          
          // 各データベースページを処理
          for (const dbPage of dbPages.results) {
            if (!allPages.includes(dbPage.id)) {
              await getSubpages(notionClient, dbPage.id, allPages);
            }
          }
        } catch (dbError) {
          console.log(`データベースクエリエラー (${databaseId}):`, dbError);
        }
      }
      
      // ケース2: ページがデータベース内のレコードの場合
      else if (pageInfoAny.parent?.type === 'database_id') {
        // データベースIDを取得
        const databaseId = pageInfoAny.parent.database_id;
        console.log(`データベースレコードを検出: ${pageId} (データベース: ${databaseId})`);
        
        // データベース内の他のページも取得したい場合はコメントを外す
        /*
        try {
          const dbPages = await notionClient.databases.query({
            database_id: databaseId,
          });
          
          for (const dbPage of dbPages.results) {
            if (!allPages.includes(dbPage.id)) {
              await getSubpages(notionClient, dbPage.id, allPages);
            }
          }
        } catch (dbError) {
          console.log(`データベースクエリエラー (${databaseId}):`, dbError);
        }
        */
      }
    } catch (e) {
      // ページが見つからない場合など
      console.log(`ページ情報取得スキップ (${pageId}):`, e);
      
      // アクセス権限のエラーメッセージの場合、ユーザーに役立つ情報を出力
      if (e instanceof Error && e.message.includes('Make sure the relevant pages and databases are shared with your integration')) {
        console.warn(`ページへのアクセス権限がありません: ${pageId} - Notionインテグレーションとページが共有されているか確認してください`);
      }
    }

    return allPages;
  } catch (error) {
    console.error('サブページ取得エラー:', error);
    // エラーがあっても処理を継続するため、現在のallPagesを返す
    return allPages;
  }
};

// ページのコメントを取得する関数
export const getPageComments = async (
  notionClient: Client,
  pageId: string
): Promise<Comment[]> => {
  try {
    console.log(`ページID: ${pageId} のコメントを取得中...`);
    
    let comments: any[] = [];
    let pageTitle = 'Untitled';
    let isDatabase = false;
    let dbRecords: any[] = [];
    
    // まずデータベースとしてアクセスを試みる
    try {
      console.log(`データベースとしてアクセス試行 - ${pageId}`);
      const dbInfo = await notionClient.databases.retrieve({
        database_id: pageId,
      });
      
      isDatabase = true;
      
      // データベースのタイトルを設定
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = dbInfo as any;
      if (db.title && db.title.length > 0) {
        pageTitle = db.title.map((t: any) => t.plain_text).join('');
      }
      
      console.log(`データベース「${pageTitle}」を検出: ${pageId}`);
      
      // データベース自体のコメントを取得
      try {
        const dbComments = await notionClient.comments.list({
          block_id: pageId,
        });
        comments = dbComments.results;
        console.log(`データベース自体のコメント数: ${comments.length}`);
      } catch (dbCommentError) {
        console.log(`データベース自体のコメント取得エラー: ${pageId}`, dbCommentError);
      }
      
      // データベース内のページ(レコード)を取得
      try {
        console.log(`データベース内のレコードを取得中...`);
        const dbPages = await notionClient.databases.query({
          database_id: pageId,
          page_size: 100
        });
        
        dbRecords = dbPages.results;
        console.log(`データベース内のレコード数: ${dbRecords.length}`);
        
        // データベース内の各レコードからコメントを取得
        for (const record of dbRecords) {
          try {
            console.log(`レコード ${record.id} のコメントを取得中...`);
            const recordComments = await notionClient.comments.list({
              block_id: record.id,
            });
            
            if (recordComments.results.length > 0) {
              console.log(`レコード ${record.id} のコメント数: ${recordComments.results.length}`);
              
              // レコードのタイトルを取得
              let recordTitle = 'Untitled Record';
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const recordObj = record as any;
                if (recordObj.properties) {
                  // タイトルプロパティを探す
                  for (const [key, prop] of Object.entries(recordObj.properties)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const property = prop as any;
                    if (property.type === 'title' && property.title && property.title.length > 0) {
                      recordTitle = property.title.map((t: any) => t.plain_text).join('');
                      break;
                    }
                  }
                }
              } catch (titleError) {
                console.log(`レコードタイトル取得エラー: ${record.id}`, titleError);
              }
              
              // コメントをマップして追加
              const recordCommentsFormatted = recordComments.results.map((comment: Record<string, any>) => {
                const thread = comment.discussion?.comments || [];
                
                return {
                  commentId: comment.id,
                  pageId: record.id,
                  pageTitle: `${pageTitle} > ${recordTitle}`,
                  author: comment.created_by?.name || 'Unknown',
                  content: comment.rich_text?.[0]?.plain_text || '',
                  isResolved: comment.resolved || false,
                  lastRepliedAt: thread.length > 0 
                    ? thread[thread.length - 1].created_time 
                    : comment.created_time,
                  mentions: extractMentions(comment.rich_text || []),
                  thread: thread.map((reply: Record<string, any>) => ({
                    commentId: reply.id,
                    author: reply.created_by?.name || 'Unknown',
                    content: reply.rich_text?.[0]?.plain_text || '',
                    createdAt: reply.created_time,
                    mentions: extractMentions(reply.rich_text || []),
                  })),
                };
              });
              
              comments = [...comments, ...recordCommentsFormatted];
            }
          } catch (recordCommentError) {
            console.log(`レコード ${record.id} のコメント取得エラー`, recordCommentError);
          }
        }
      } catch (dbQueryError) {
        console.log(`データベースクエリエラー: ${pageId}`, dbQueryError);
      }
      
      // データベースとそのレコードからコメントを取得した場合、ここで返す
      if (isDatabase) {
        console.log(`データベースとそのレコードから合計 ${comments.length} 件のコメントを取得`);
        
        // コメントがない場合は空配列を返す
        if (comments.length === 0) {
          return [];
        }
        
        // データベース自体からのコメントをマップして返す
        const formattedComments: Comment[] = comments.map((comment: Record<string, any>) => {
          try {
            // すでに形式が整っている場合はそのまま返す
            if (comment.commentId && comment.pageId && comment.pageTitle) {
              return comment as Comment;
            }
            
            // コメントスレッドの処理
            const thread = comment.discussion?.comments || [];
            
            return {
              commentId: comment.id,
              pageId: pageId,
              pageTitle: pageTitle,
              author: comment.created_by?.name || 'Unknown',
              content: comment.rich_text?.[0]?.plain_text || '',
              isResolved: comment.resolved || false,
              lastRepliedAt: thread.length > 0 
                ? thread[thread.length - 1].created_time 
                : comment.created_time,
              mentions: extractMentions(comment.rich_text || []),
              thread: thread.map((reply: Record<string, any>) => ({
                commentId: reply.id,
                author: reply.created_by?.name || 'Unknown',
                content: reply.rich_text?.[0]?.plain_text || '',
                createdAt: reply.created_time,
                mentions: extractMentions(reply.rich_text || []),
              })),
            };
          } catch (commentError) {
            console.error(`コメント処理エラー:`, commentError);
            return {
              commentId: comment.id || 'unknown-id',
              pageId: pageId,
              pageTitle: pageTitle,
              author: 'Unknown',
              content: 'コメントの読み込みエラー',
              isResolved: false,
              lastRepliedAt: new Date().toISOString(),
              mentions: [],
              thread: [],
            };
          }
        });
        
        return formattedComments;
      }
    } catch (dbError) {
      // データベースではない場合はページとして処理を続行
      console.log(`データベースではない: ${pageId}`);
    }

    // 通常のページとしてコメントを取得
    try {
      const response = await notionClient.comments.list({
        block_id: pageId,
      });
      
      comments = response.results;
      console.log(`ページ ${pageId} のコメント数: ${comments.length}`);
    } catch (commentsError) {
      console.error(`コメント一覧取得エラー (${pageId}):`, commentsError);
      // アクセス権限エラーの場合のメッセージ
      if (commentsError instanceof Error && commentsError.message.includes('Make sure the relevant pages and databases are shared with your integration')) {
        console.warn(`コメントへのアクセス権限がありません: ${pageId} - Notionインテグレーションとページが共有されているか確認してください`);
      }
      return []; // エラーの場合は空の配列を返す
    }
    
    // ページの場合もデータベースレコードの可能性を確認
    if (comments.length === 0) {
      let isDBRecord = false;
      let parentDatabaseId = '';
      
      try {
        // ページの詳細情報を取得
        const pageInfo = await notionClient.pages.retrieve({
          page_id: pageId,
        });
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageInfoAny = pageInfo as any;
        
        // ページタイトルを設定
        if (pageInfoAny.properties) {
          for (const [_key, prop] of Object.entries(pageInfoAny.properties)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const property = prop as any;
            if (property.type === 'title' && property.title?.[0]?.plain_text) {
              pageTitle = property.title[0].plain_text;
              break;
            }
          }
        }
        
        // ページがデータベース内のレコードの場合
        if (pageInfoAny.parent?.type === 'database_id') {
          isDBRecord = true;
          parentDatabaseId = pageInfoAny.parent.database_id;
          console.log(`${pageId} はデータベースレコードです (データベース: ${parentDatabaseId})`);
          
          // 親データベースのタイトルを取得
          try {
            const parentDb = await notionClient.databases.retrieve({
              database_id: parentDatabaseId,
            });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = parentDb as any;
            let dbName = '不明';
            if (db.title && db.title.length > 0) {
              dbName = db.title.map((t: any) => t.plain_text).join('');
            }
            
            pageTitle = `${dbName} > ${pageTitle}`;
          } catch (parentDbError) {
            console.log(`親データベース情報取得失敗: ${parentDatabaseId}`, parentDbError);
          }
          
          // データベースレコードのコメントを改めて確認
          try {
            console.log(`データベースレコードのコメントを再確認: ${pageId}`);
            const recordComments = await notionClient.comments.list({
              block_id: pageId,
            });
            
            if (recordComments.results.length > 0) {
              console.log(`データベースレコード ${pageId} のコメント数: ${recordComments.results.length}`);
              comments = recordComments.results;
            }
          } catch (recordCommentError) {
            console.log(`データベースレコードコメント再確認エラー: ${pageId}`, recordCommentError);
          }
        }
      } catch (pageInfoErr) {
        console.log(`ページ情報取得エラー (${pageId}):`, pageInfoErr);
      }
    } else {
      // コメントが取得できた場合はページタイトルを取得
      try {
        const pageInfo = await notionClient.pages.retrieve({
          page_id: pageId,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const page = pageInfo as any;
        if (page.properties?.title?.title?.[0]?.plain_text) {
          pageTitle = page.properties.title.title[0].plain_text;
        } else if (page.properties?.Name?.title?.[0]?.plain_text) {
          pageTitle = page.properties.Name.title[0].plain_text;
        } else {
          // タイトルプロパティを探す
          for (const [_key, prop] of Object.entries(page.properties || {})) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const property = prop as any;
            if (property.type === 'title' && property.title?.[0]?.plain_text) {
              pageTitle = property.title[0].plain_text;
              break;
            }
          }
        }
        
        console.log(`ページタイトル: ${pageTitle}`);
      } catch (err) {
        console.log(`ページタイトル取得エラー (${pageId}):`, err);
        // ページが見つからない場合は、IDの一部をタイトルとして使用
        pageTitle = `ページ (ID: ${pageId.substring(0, 8)}...)`;
      }
    }

    // コメントの処理（エラー処理強化）
    if (comments.length === 0) {
      return []; // コメントがない場合は空配列を返す
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return comments.map((comment: Record<string, any>) => {
      try {
        // コメントスレッドの処理
        const thread = comment.discussion?.comments || [];
        
        return {
          commentId: comment.id,
          pageId: pageId,
          pageTitle: pageTitle,
          author: comment.created_by?.name || 'Unknown',
          content: comment.rich_text?.[0]?.plain_text || '',
          isResolved: comment.resolved || false,
          lastRepliedAt: thread.length > 0 
            ? thread[thread.length - 1].created_time 
            : comment.created_time,
          mentions: extractMentions(comment.rich_text || []),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thread: thread.map((reply: Record<string, any>) => ({
            commentId: reply.id,
            author: reply.created_by?.name || 'Unknown',
            content: reply.rich_text?.[0]?.plain_text || '',
            createdAt: reply.created_time,
            mentions: extractMentions(reply.rich_text || []),
          })),
        };
      } catch (commentError) {
        console.error(`コメント処理エラー:`, commentError);
        // エラーが発生した場合でもスキップせず、デフォルト値を使用
        return {
          commentId: comment.id || 'unknown-id',
          pageId: pageId,
          pageTitle: pageTitle,
          author: 'Unknown',
          content: 'コメントの読み込みエラー',
          isResolved: false,
          lastRepliedAt: new Date().toISOString(),
          mentions: [],
          thread: [],
        };
      }
    });
  } catch (error) {
    console.error(`コメント取得エラー (${pageId}):`, error);
    return []; // 最終的なエラーでも空配列を返す
  }
};

// DatabaseInfoの型宣言を修正
interface DiagnoseResult {
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
  cleanId?: string;
}

// Notionページの診断を行うための関数
export const diagnoseNotionPage = async (
  notionClient: Client,
  pageId: string
): Promise<DiagnoseResult> => {
  // IDの前処理（ハイフンがないURLから直接コピーされたIDの場合に対応）
  let cleanId = pageId;
  if (cleanId.length === 32) {
    // 8-4-4-4-12 形式に変換
    cleanId = `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`;
  }
  // URLからのIDを抽出
  else if (cleanId.includes('notion.so/') || cleanId.includes('notion.site/')) {
    const match = cleanId.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
    if (match) {
      cleanId = match[1];
      if (cleanId.length === 32) {
        // 8-4-4-4-12 形式に変換
        cleanId = `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`;
      }
    }
  }

  // 型付きの結果オブジェクトを作成
  const result: DiagnoseResult = {
    access: false,
    type: 'unknown',
    cleanId
  };

  // まずデータベースとしてアクセスを試みる
  try {
    console.log(`診断: データベースとしてアクセス試行 - ${cleanId}`);
    const dbInfo = await notionClient.databases.retrieve({
      database_id: cleanId,
    });
    
    // データベースにアクセスできた場合
    result.access = true;
    result.type = 'database';
    
    // データベースタイトルを設定
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = dbInfo as any;
    if (db.title && db.title.length > 0) {
      result.title = db.title.map((t: any) => t.plain_text).join('');
    }
    
    // データベース内のページも確認
    try {
      console.log(`診断: データベース内のページを確認 - ${cleanId}`);
      const dbPages = await notionClient.databases.query({
        database_id: cleanId,
        page_size: 1 // 1件だけ取得して存在確認
      });
      
      if (dbPages.results.length > 0) {
        console.log(`診断: データベース内にレコードを確認 - ${dbPages.results.length}件以上`);
      } else {
        console.log(`診断: データベース内にレコードなし`);
      }
    } catch (dbQueryError) {
      console.log(`診断: データベースクエリエラー - ${cleanId}`, dbQueryError);
    }
    
    return result;
  } catch (dbError) {
    // データベースではない、または権限がない場合は次へ
    console.log(`診断: データベースではない - ${cleanId}`);
  }

  // 次にページとしてアクセスを試みる
  try {
    console.log(`診断: ページとしてアクセス試行 - ${cleanId}`);
    const pageInfo = await notionClient.pages.retrieve({
      page_id: cleanId,
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = pageInfo as any;
    
    // アクセスできた場合
    result.access = true;
    result.type = page.object || 'unknown';
    
    // 親オブジェクトの種類を判定
    if (page.parent) {
      result.parentType = page.parent.type;
      
      // データベース内のページか
      if (page.parent.type === 'database_id') {
        result.parentId = page.parent.database_id;
        
        // データベース自体の情報も取得
        try {
          console.log(`診断: 親データベースの確認 - ${result.parentId}`);
          const parentDb = await notionClient.databases.retrieve({
            database_id: result.parentId,
          });
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const db = parentDb as any;
          let dbName = '不明';
          if (db.title && db.title.length > 0) {
            dbName = db.title.map((t: any) => t.plain_text).join('');
          }
          
          // 親データベースIDが存在する場合のみデータベース情報を生成
          if (result.parentId) {
            result.databaseInfo = {
              id: result.parentId,
              name: dbName,
              access: true
            };
          } else {
            // 親IDがない場合は空文字列を使用
            result.databaseInfo = {
              id: '',
              name: dbName,
              access: true
            };
          }
          
          console.log(`診断: 親データベース情報取得成功 - ${dbName}`);
        } catch (parentDbError) {
          console.log(`診断: 親データベース情報取得失敗 - ${result.parentId}`, parentDbError);
          
          // 同様に、エラー時も
          if (result.parentId) {
            result.databaseInfo = {
              id: result.parentId,
              access: false
            };
          } else {
            result.databaseInfo = {
              id: '',
              access: false
            };
          }
          
          if (parentDbError instanceof Error) {
            result.error = `親データベースへのアクセスエラー: ${parentDbError.message}`;
          }
        }
      }
      // ワークスペースのページか
      else if (page.parent.type === 'workspace') {
        result.parentType = 'workspace';
      }
      // 親ページを持つか
      else if (page.parent.type === 'page_id') {
        result.parentId = page.parent.page_id;
      }
    }
    
    // タイトルの取得を試みる
    if (page.properties?.title?.title?.[0]?.plain_text) {
      result.title = page.properties.title.title[0].plain_text;
    } else if (page.properties?.Name?.title?.[0]?.plain_text) {
      result.title = page.properties.Name.title[0].plain_text;
    } else {
      // タイトルプロパティを探す
      for (const [_key, prop] of Object.entries(page.properties || {})) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const property = prop as any;
        if (property.type === 'title' && property.title?.[0]?.plain_text) {
          result.title = property.title[0].plain_text;
          break;
        }
      }
    }
    
    // コメントアクセスも確認する
    try {
      console.log(`診断: コメントアクセス確認 - ${cleanId}`);
      const commentResponse = await notionClient.comments.list({
        block_id: cleanId,
      });
      
      console.log(`診断: コメント取得成功 - ${commentResponse.results.length}件`);
    } catch (commentError) {
      // コメントアクセスのエラーは記録するが、ページアクセス自体は成功している
      console.log(`診断: コメントアクセスエラー - ${cleanId}`, commentError);
      
      if (commentError instanceof Error) {
        result.error = `コメントアクセスエラー: ${commentError.message}`;
      }
    }
    
    return result;
  } catch (error) {
    // ページアクセスエラー
    result.access = false;
    
    if (error instanceof Error) {
      result.error = error.message;
      console.log(`診断: ページアクセスエラー - ${cleanId}: ${error.message}`);
    }
  }
  
  return result;
};

// NotionのURL形式からページIDを抽出する関数
export const extractPageIdFromUrl = (url: string): string | null => {
  // 標準的なNotionのURL形式
  // https://www.notion.so/workspace/Page-Title-123456789abcdef123456789abcdef12
  // または
  // https://www.notion.so/123456789abcdef123456789abcdef12
  
  if (!url) return null;
  
  // 完全なURLからIDを抽出
  const urlMatch = url.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
  if (urlMatch) {
    let id = urlMatch[1];
    
    // ハイフンなしの32文字のIDを標準形式に変換
    if (id.length === 32 && !id.includes('-')) {
      id = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
    }
    
    return id;
  }
  
  // そのままIDとみなせるか確認
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(url)) {
    return url;
  }
  
  // 32文字のIDの場合（ハイフンなし）
  if (/^[a-f0-9]{32}$/i.test(url)) {
    const id = url;
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  
  return null;
};

// リッチテキストからメンションを抽出する関数
const extractMentions = (richText: any[]): string[] => {
  const mentions: string[] = [];
  
  richText.forEach((text) => {
    if (text.type === 'mention' && text.mention?.type === 'user') {
      mentions.push(text.mention.user.name || text.mention.user.id);
    }
  });
  
  return mentions;
};

// 指定された日数以上返信がないコメントをフィルタリングする関数
export const filterNoReplyComments = (
  comments: Comment[],
  days: number
): Comment[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return comments.filter((comment) => {
    const lastReplied = new Date(comment.lastRepliedAt);
    return lastReplied < cutoffDate;
  });
};

// 自分宛てのコメントをフィルタリングする関数
export const filterMyComments = (
  comments: Comment[],
  userId: string
): Comment[] => {
  return comments.filter((comment) => {
    // メンションに自分が含まれているか
    return comment.mentions.includes(userId);
  });
};

// 自分が参加しているスレッドをフィルタリングする関数
export const filterParticipatingThreads = (
  comments: Comment[],
  userId: string
): Comment[] => {
  return comments.filter((comment) => {
    // スレッド内に自分の投稿があるか
    return comment.thread.some((reply) => reply.author === userId);
  });
};
