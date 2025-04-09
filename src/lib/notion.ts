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
    const response = await notionClient.search({
      query,
      filter: {
        property: 'object',
        value: 'page',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await Promise.all(response.results.map(async (page: Record<string, any>) => {
      // ページタイトルの取得試行
      let title = 'Untitled';
      
      try {
        // ページタイトルを取得する複数の方法を試みる
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

    // 完全一致のみを返す
    return results.filter(page => page.title.toLowerCase() === query.toLowerCase());
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

    // データベース内のページも検索
    try {
      // ページの詳細情報を取得し、それがデータベースかどうか確認
      const pageInfo = await notionClient.pages.retrieve({
        page_id: pageId,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((pageInfo as any).parent?.type === 'database_id') {
        // データベース内の全ページを取得
        const databaseId = (pageInfo as any).parent.database_id;
        const dbPages = await notionClient.databases.query({
          database_id: databaseId,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const dbPage of dbPages.results) {
          if (!allPages.includes(dbPage.id)) {
            await getSubpages(notionClient, dbPage.id, allPages);
          }
        }
      }
    } catch (e) {
      // データベース取得エラーは無視（通常のページの場合など）
      console.log('データベース取得スキップ:', e);
    }

    return allPages;
  } catch (error) {
    console.error('サブページ取得エラー:', error);
    throw error;
  }
};

// ページのコメントを取得する関数
export const getPageComments = async (
  notionClient: Client,
  pageId: string
): Promise<Comment[]> => {
  try {
    const response = await notionClient.comments.list({
      block_id: pageId,
    });

    // ページのタイトルを取得
    let pageTitle = 'Untitled';
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
    } catch (err) {
      console.error('ページタイトル取得エラー:', err);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.results.map((comment: Record<string, any>) => {
      // コメントスレッドの処理
      const thread = comment.discussion?.comments || [];
      
      return {
        commentId: comment.id,
        pageId: pageId,
        pageTitle: pageTitle,
        author: comment.created_by.name || 'Unknown',
        content: comment.rich_text?.[0]?.plain_text || '',
        isResolved: comment.resolved || false,
        lastRepliedAt: thread.length > 0 
          ? thread[thread.length - 1].created_time 
          : comment.created_time,
        mentions: extractMentions(comment.rich_text || []),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thread: thread.map((reply: Record<string, any>) => ({
          commentId: reply.id,
          author: reply.created_by.name || 'Unknown',
          content: reply.rich_text?.[0]?.plain_text || '',
          createdAt: reply.created_time,
          mentions: extractMentions(reply.rich_text || []),
        })),
      };
    });
  } catch (error) {
    console.error('コメント取得エラー:', error);
    throw error;
  }
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
