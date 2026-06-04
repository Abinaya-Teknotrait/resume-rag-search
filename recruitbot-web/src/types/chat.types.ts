export interface Message {
  id: string;
  type: 'user' | 'bot';
  text?: string;
  content?: React.ReactNode;
  timestamp: Date;
}
