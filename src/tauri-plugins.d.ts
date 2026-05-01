declare module "@tauri-apps/plugin-dialog" {
  export function save(opts?: {
    filters?: { name: string; extensions: string[] }[];
    defaultPath?: string;
  }): Promise<string | null>;
  export function open(opts?: {
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
  }): Promise<string | string[] | null>;
}

declare module "@tauri-apps/plugin-fs" {
  export function writeTextFile(path: string, contents: string): Promise<void>;
  export function readTextFile(path: string): Promise<string>;
}
