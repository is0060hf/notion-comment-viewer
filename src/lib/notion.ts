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
    return response.results.map((page: Record<string, any>) => ({
      id: page.id,
      title: page.properties?.title?.title?.[0]?.plain_text || 
             page.properties?.Name?.title?.[0]?.plain_text || 
             'Untitled',
      url: page.url,
    }));
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
    const response = await notionClient.search({
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
    const subpages = response.results.filter((page: Record<string, any>) => {
      // 親ページIDを確認（APIの仕様に応じて調整が必要かもしれません）
      return page.parent?.page_id === pageId;
    });

    for (const subpage of subpages) {
      await getSubpages(notionClient, subpage.id, allPages);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.results.map((comment: Record<string, any>) => {
      // コメントスレッドの処理
      const thread = comment.discussion?.comments || [];
      
      return {
        commentId: comment.id,
        pageId: pageId,
        pageTitle: '', // APIからページタイトルを取得する方法が必要
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractMentions = (richText: Record<string, any>[]): string[] => {
  const mentions: string[] = [];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  richText.forEach((text: Record<string, any>) => {
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
