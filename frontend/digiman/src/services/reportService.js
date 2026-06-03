import api from "./api";

function getTextModerationCategories(targetTextLabel) {
    return [
        {
            value: "text_toxicity",
            label: `Abusive or toxic ${targetTextLabel}`,
        },
        {
            value: "text_severe_toxicity",
            label: `Severely abusive ${targetTextLabel}`,
        },
        {
            value: "text_sexually_explicit",
            label: `Sexually explicit ${targetTextLabel}`,
        },
        {
            value: "text_profanity",
            label: `Profanity in ${targetTextLabel}`,
        },
    ];
}

function getImageModerationCategories(targetImageLabel) {
    return [
        {
            value: "image_sexual_activity",
            label: `Sexual activity in ${targetImageLabel}`,
        },
        {
            value: "image_sexual_display",
            label: `Sexual display in ${targetImageLabel}`,
        },
        {
            value: "image_erotica",
            label: `Erotic content in ${targetImageLabel}`,
        },
        {
            value: "image_suggestive_content",
            label: `Suggestive content in ${targetImageLabel}`,
        },
        {
            value: "image_gore",
            label: `Gore or graphic violence in ${targetImageLabel}`,
        },
        {
            value: "image_offensive",
            label: `Offensive imagery in ${targetImageLabel}`,
        },
    ];
}

const COMMENT_TEXT_MODERATION_CATEGORIES = getTextModerationCategories("comment text");
const COMMENT_IMAGE_MODERATION_CATEGORIES = getImageModerationCategories("comment image");

const USER_TEXT_MODERATION_CATEGORIES = getTextModerationCategories(
    "username or display name"
);
const USER_IMAGE_MODERATION_CATEGORIES = getImageModerationCategories("user avatar");

export const REPORT_CATEGORIES_BY_TARGET = {
    manga_title: [
        { value: "duplicate_entry", label: "Duplicate entry" },
        { value: "information_to_correct", label: "Information to correct" },
        { value: "missing_cover_art", label: "Missing cover art" },
        { value: "troll_entry", label: "Troll entry" },
        { value: "vandalism", label: "Vandalism" },
        { value: "other", label: "Other" },
    ],
    comment: [
        { value: "harassment", label: "Harassment" },
        { value: "spam", label: "Spam" },
        ...COMMENT_TEXT_MODERATION_CATEGORIES,
        ...COMMENT_IMAGE_MODERATION_CATEGORIES,
    ],
    user: [
        { value: "offensive_username", label: "Offensive username" },
        { value: "offensive_avatar", label: "Offensive user avatar" },
        { value: "spambot", label: "Spambot" },
        ...USER_TEXT_MODERATION_CATEGORIES,
        ...USER_IMAGE_MODERATION_CATEGORIES,
        { value: "other", label: "Other" },
    ],
    chapter: [
        { value: "inappropriate_content", label: "Inappropriate content" },
        { value: "misleading_metadata", label: "Misleading metadata" },
        { value: "other", label: "Other" },
    ],
};

export const REPORT_CATEGORIES = [
    ...REPORT_CATEGORIES_BY_TARGET.manga_title,
    ...REPORT_CATEGORIES_BY_TARGET.comment,
    ...REPORT_CATEGORIES_BY_TARGET.user,
    ...REPORT_CATEGORIES_BY_TARGET.chapter,
];

export function getReportCategories(targetContentType) {
    return REPORT_CATEGORIES_BY_TARGET[targetContentType] || REPORT_CATEGORIES_BY_TARGET.comment;
}

/**
 * @param {{ category: string, description?: string, target_content_type: string, target_content_id: string }} data
 */
export async function submitReport(data) {
    const res = await api.post("reports/", data);
    if (res.data && res.data.detail) throw new Error(res.data.detail);
    return res.data;
}
