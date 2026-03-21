declare module 'translatte' {
  interface TranslatteResult {
    text: string;
    from: {
      language: {
        didYouMean: boolean;
        iso: string;
      };
    };
  }

  interface TranslatteOptions {
    from?: string;
    to: string;
  }

  function translatte(text: string, options: TranslatteOptions): Promise<TranslatteResult>;
  export default translatte;
}
