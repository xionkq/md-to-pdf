declare module 'pdfmake/build/pdfmake.js' {
  const pdfMake: any;
  export = pdfMake;
}

declare module 'pdfmake/build/vfs_fonts.js' {
  export const vfs: Record<string, string>;
}


