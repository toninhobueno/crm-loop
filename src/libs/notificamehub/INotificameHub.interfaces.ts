export interface INotificameHubConfig {
  token: string;
  channelId: string;
  channel: "whatsapp" | "instagram" | "facebook";
  whatsappId: number;
}

export interface INotificameHubTextContent {
  type: "text";
  text: string;
}

export interface INotificameHubFileContent {
  type: "file";
  fileMimeType: "audio" | "image" | "video" | "document";
  fileUrl: string;
  fileCaption?: string;
  fileName?: string;
}

// Tipos diretos de mídia (Instagram envia assim)
export interface INotificameHubImageContent {
  type: "image";
  fileUrl: string;
  fileMimeType?: string;
  fileCaption?: string;
  fileName?: string;
}

export interface INotificameHubVideoContent {
  type: "video";
  fileUrl: string;
  fileMimeType?: string;
  fileCaption?: string;
  fileName?: string;
}

export interface INotificameHubAudioContent {
  type: "audio";
  fileUrl: string;
  fileMimeType?: string;
  fileCaption?: string;
  fileName?: string;
}

export interface INotificameHubLocationContent {
  type: "location";
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface INotificameHubContactsContent {
  type: "contacts";
  contacts: INotificameHubContact[];
}

export interface INotificameHubContact {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{
    phone: string;
    type?: string;
    wa_id?: string;
  }>;
  emails?: Array<{
    email: string;
    type?: string;
  }>;
}

export interface INotificameHubTemplateContent {
  type: "template";
  templateId: string;
  fields?: Record<string, string>;
}

export interface INotificameHubInteractiveButton {
  type: "reply";
  reply: {
    id: string;
    title: string;
  };
}

export interface INotificameHubInteractiveContent {
  type: "interactive";
  interactive: {
    type: "button" | "list";
    header?: {
      type: "text" | "image" | "video" | "document";
      text?: string;
      image?: { link: string };
      video?: { link: string };
      document?: { link: string; filename: string };
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons?: INotificameHubInteractiveButton[];
      button?: string;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

// Tipos específicos do Instagram
export interface INotificameHubInstagramReelContent {
  type: "ig_reel";
  fileUrl?: string;
  fileMimeType?: string;
  fileName?: string;
}

export interface INotificameHubInstagramPostContent {
  type: "ig_post";
  fileUrl?: string;
  fileMimeType?: string;
  fileName?: string;
}

export interface INotificameHubShareContent {
  type: "share";
  fileUrl?: string;
  fileMimeType?: string;
  fileName?: string;
}

export interface INotificameHubStoryMentionContent {
  type: "story_mention";
  fileUrl?: string;
  fileMimeType?: string;
}

export interface INotificameHubStoryReplyContent {
  type: "story_reply";
  text?: string;
}

export type INotificameHubContent =
  | INotificameHubTextContent
  | INotificameHubFileContent
  | INotificameHubImageContent
  | INotificameHubVideoContent
  | INotificameHubAudioContent
  | INotificameHubLocationContent
  | INotificameHubContactsContent
  | INotificameHubTemplateContent
  | INotificameHubInteractiveContent
  | INotificameHubInstagramReelContent
  | INotificameHubInstagramPostContent
  | INotificameHubShareContent
  | INotificameHubStoryMentionContent
  | INotificameHubStoryReplyContent;

export interface INotificameHubMessagePayload {
  from: string;
  to: string;
  contents: INotificameHubContent[];
}

export interface INotificameHubMessageResponse {
  id: string;
  status: string;
  channel: string;
  from: string;
  to: string;
  direction: string;
  contents: INotificameHubContent[];
  createdAt: string;
}

export interface INotificameHubWebhookMessage {
  id: string;
  channel: string;
  from: string;
  to: string;
  direction: "IN" | "OUT";
  contents: INotificameHubContent[];
  timestamp: string;
  contact?: {
    id: string;
    name: string;
    profilePicUrl?: string;
  };
  visitor?: {
    id?: string;
    firstName?: string;
    name?: string;
    displayName?: string;
    picture?: string;
    profilePicUrl?: string;
    avatar?: string;
  };
}

export interface INotificameHubWebhookStatus {
  id: string;
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface INotificameHubWebhookPayload {
  type: string; // Can be "MESSAGE", "message", "STATUS", "status", etc.
  message?: INotificameHubWebhookMessage;
  status?: INotificameHubWebhookStatus;
  channel: string;
  timestamp: string;
  subscriptionId?: string; // Channel ID used to find the connection
}

export interface INotificameHubSubscription {
  id: string;
  url: string;
  channel: string;
  events: string[];
  status: "active" | "inactive";
  createdAt: string;
}

export interface INotificameHubError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
