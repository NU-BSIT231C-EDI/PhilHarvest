/// <reference types="vite/client" />
import 'react';
import 'react-dom';

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_EDI_AUTH_TOKEN: string;
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
