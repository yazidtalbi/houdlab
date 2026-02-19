export type ChatRole = "user" | "assistant";

export type TextMessage = {
  id: string;
  role: ChatRole;
  kind: "text";
  text: string;
  createdAt: string;
};

export type FaqMessage = {
  id: string;
  role: "assistant";
  kind: "faq";
  faqId: string;
  createdAt: string;
};

export type ChatMessage = TextMessage | FaqMessage;

export type FaqCta = {
  label: string;
  href: string;
};

export type FaqEntry = {
  title: string;
  body: string[];
  cta?: FaqCta;
};

export type FaqBank = Record<string, FaqEntry>;

