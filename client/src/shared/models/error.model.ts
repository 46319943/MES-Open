export interface ErrorBasicContent {
  name: string;
  message: string;
  stack?: string | undefined ;
  details?: object | undefined ;
}

export interface ErrorHTTPContent {
  status: number;
  url: string;
  method: string;
  headers: Record<string, unknown>;
  body: object;
}

export interface ErrorResponse extends ErrorBasicContent, ErrorHTTPContent {}
