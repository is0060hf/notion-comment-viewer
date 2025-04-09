// Notion API関連の型定義

export type NotionPage = {
  id: string;
  title: string;
  url: string;
};

export type CommentThread = {
  commentId: string;
  author: string;
  content: string;
  createdAt: string;
  mentions: string[];
};

export type Comment = {
  commentId: string;
  pageId: string;
  pageTitle: string;
  author: string;
  content: string;
  isResolved: boolean;
  lastRepliedAt: string;
  mentions: string[];
  thread: CommentThread[];
};

export type SearchResult = {
  results: NotionPage[];
};

export type CommentsResult = {
  comments: Comment[];
};

// フィルター関連の型定義
export type CommentFilter = {
  filterUnresolved: boolean;
  filterNoReplyDays: number;
  filterMyComments: boolean;
  filterParticipating: boolean;
};

// 認証関連の型定義
export type NotionUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
};
