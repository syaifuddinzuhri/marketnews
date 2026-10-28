export interface Translator {
  translate(text: string): Promise<string>;
}
