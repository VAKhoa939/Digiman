import { formatTime } from "./formatTime";

export function mapMangaTitle(fetchedData) {
  if (!fetchedData) return null;
  return {
    id: fetchedData.id,
    title: fetchedData.title,
    altTitle: fetchedData.alternative_title,
    coverUrl: fetchedData.cover_image,
    author: fetchedData.author_name,
    artist: fetchedData.author_name, // same as author for now
    synopsis: fetchedData.description,
    status: fetchedData.publication_status,
    chapterCount: fetchedData.chapter_count,
    dateUpdated: fetchedData.latest_chapter_date,
    publicationDate: fetchedData.publication_date,
    isPremium: fetchedData.is_premium,
    averageRating: fetchedData.average_rating ?? 0,
    readCount: fetchedData.read_count ?? 0,
  };
}

export function mapChapter(fetchedData) {
  if (!fetchedData) return null;
  return {
    id: fetchedData.id,
    number: fetchedData.chapter_number,
    title: fetchedData.title,
    mangaTitle: fetchedData.manga_title,
    mangaTitleID: fetchedData.manga_title_id,
    date: fetchedData.upload_date,
    pageCount: fetchedData.page_count,
    prevChapterId: fetchedData.previous_chapter_id,
    nextChapterId: fetchedData.next_chapter_id,
    isPremium: fetchedData.is_premium,
  };
}

export function mapPage(fetchedData) {
  if (!fetchedData) return null;
  return {
    id: fetchedData.id,
    index: fetchedData.page_number,
    url: fetchedData.image_url,
    alt: `Page ${fetchedData.page_number}`,
  };
}

export function mapComment(fetchedData) {
  if (!fetchedData) return null;
  return {
    id: fetchedData.id,
    parentCommentId: fetchedData.parent_comment_id,
    name: fetchedData.owner_name,
    avatar: fetchedData.owner_avatar,
    ownerId: fetchedData.owner_id,
    text: fetchedData.text,
    imageUrl: fetchedData.attached_image_url,
    created_at: fetchedData.created_at,
    status: fetchedData.status,
    isEdited: fetchedData.is_edited,
    hiddenReasons: fetchedData.hidden_reasons,
  };
}

export function mapInputCommentData(
  text,
  mangaId,
  chapterId,
  editPreview = null,
  isDeleted = false,
  parentCommentId = null
) {
  // if isDeleted, only status should be set
  if (isDeleted) return { status: "deleted" };
  // only one of manga_title_id or chapter_id should be set
  let manga_title = mangaId;
  if (chapterId !== undefined && chapterId !== null) manga_title = null;

  let attached_image_url = undefined;
  if (editPreview === null || editPreview.length === 0) 
    attached_image_url = ''; 
  return {
    text: text.trim(),
    manga_title: manga_title,
    chapter: chapterId ?? null,
    parent_comment: parentCommentId,
    attached_image_url: attached_image_url
  };
}

export function mapReaderSubscription(fetchedData) {
  if (!fetchedData) return null;
  let lastPaymentTransaction = fetchedData.last_payment_transaction;
  lastPaymentTransaction = lastPaymentTransaction && {
    status: lastPaymentTransaction.status,
    createdAt: formatTime(lastPaymentTransaction.created_at),
    paidAt: formatTime(lastPaymentTransaction.paid_at),
    nextPaymentAttemptAt: formatTime(lastPaymentTransaction.next_payment_attempt_at),
  };
  return {
    id: fetchedData.id,
    planName: fetchedData.plan_name,
    features: fetchedData.features,
    description: fetchedData.description,
    status: fetchedData.status,
    isActive: fetchedData.is_active,
    lastPurchaseStatus: fetchedData.last_purchase_status,
    isAutoRenewal: fetchedData.is_auto_renewal,
    startDate: formatTime(fetchedData.start_date),
    nextBillingDate: formatTime(fetchedData.next_billing_date),
    lastBillingDate: formatTime(fetchedData.last_billing_date),
    endedAt: formatTime(fetchedData.ended_at),
    provider: fetchedData.provider,
    lastPaymentTransaction: lastPaymentTransaction,
  }
}