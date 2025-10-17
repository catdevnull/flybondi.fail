declare module "bun" {
  type S3Data =
    | string
    | Uint8Array
    | ArrayBuffer
    | Blob
    | ReadableStream
    | Response
    | Request;

  interface S3ClientOptions {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;
    endpoint?: string;
    bucket?: string;
    virtualHostedStyle?: boolean;
  }

  interface S3WriteOptions {
    type?: string;
    acl?: string;
  }

  interface S3ListOptions {
    prefix?: string;
    maxKeys?: number;
    startAfter?: string;
    fetchOwner?: boolean;
  }

  interface S3ListObject {
    key?: string;
    size?: number;
    eTag?: string;
    lastModified?: Date;
  }

  interface S3ListResponse {
    contents?: S3ListObject[];
    isTruncated?: boolean;
    nextContinuationToken?: string;
  }

  interface S3File {
    text(): Promise<string>;
    json<T = unknown>(): Promise<T>;
    write(data: S3Data, options?: S3WriteOptions): Promise<number>;
  }

  export class S3Client {
    constructor(options?: S3ClientOptions);
    file(path: string, options?: S3ClientOptions): S3File;
    write(key: string, data: S3Data, options?: S3WriteOptions): Promise<number>;
    list(options?: S3ListOptions): Promise<S3ListResponse>;
  }

  export const s3: S3Client;
}
